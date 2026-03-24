import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { WorkOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { AddPartDto } from './dto/add-part.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
  WorkOrderPartResponse,
  WorkOrderResponse,
  WorkOrderTaskResponse,
} from './interfaces/work-order-response.interface';

const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  recepcion: [WorkOrderStatus.diagnostico, WorkOrderStatus.cancelado],
  diagnostico: [WorkOrderStatus.aprobado, WorkOrderStatus.cancelado],
  aprobado: [WorkOrderStatus.en_progreso, WorkOrderStatus.cancelado],
  en_progreso: [WorkOrderStatus.completado, WorkOrderStatus.cancelado],
  completado: [WorkOrderStatus.entregado],
  entregado: [],
  cancelado: [],
};

const INCLUDE_RELATIONS = {
  client: true,
  vehicle: true,
  mechanic: true,
  tasks: { orderBy: { sort_order: 'asc' as const } },
  parts: {
    include: { product: { select: { name: true, code: true } } },
    orderBy: { created_at: 'asc' as const },
  },
};

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(WorkOrdersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateWorkOrderDto): Promise<WorkOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertClientExists(dto.clientId, tenantId);
    await this.assertVehicleExists(dto.vehicleId, tenantId);
    if (dto.assignedTo) {
      await this.assertMechanicExists(dto.assignedTo, tenantId);
    }

    const orderNumber = await this.generateOrderNumber(tenantId);

    const workOrder = await this.prisma.workOrder.create({
      data: {
        tenant_id: tenantId,
        order_number: orderNumber,
        client_id: dto.clientId,
        vehicle_id: dto.vehicleId,
        assigned_to: dto.assignedTo,
        description: dto.description,
        priority: dto.priority,
        mileage_in: dto.mileageIn,
      },
      include: INCLUDE_RELATIONS,
    });

    this.logger.info(
      { workOrderId: workOrder.id, tenantId, orderNumber },
      'Work order created',
    );

    return this.mapWorkOrder(workOrder);
  }

  async findAll(status?: WorkOrderStatus): Promise<WorkOrderResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const where: Prisma.WorkOrderWhereInput = { tenant_id: tenantId };
    if (status) {
      where.status = status;
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where,
      include: INCLUDE_RELATIONS,
      orderBy: { created_at: 'desc' },
    });

    return workOrders.map((wo) => this.mapWorkOrder(wo));
  }

  async findOne(id: string): Promise<WorkOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, tenant_id: tenantId },
      include: INCLUDE_RELATIONS,
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    return this.mapWorkOrder(workOrder);
  }

  async update(
    id: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.workOrder.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    if (dto.status && dto.status !== existing.status) {
      this.validateTransition(existing.status, dto.status);
    }

    if (dto.assignedTo) {
      await this.assertMechanicExists(dto.assignedTo, tenantId);
    }

    const data: Prisma.WorkOrderUpdateInput = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === WorkOrderStatus.completado) {
        data.completed_date = new Date();
      }
      if (dto.status === WorkOrderStatus.entregado) {
        data.delivered_date = new Date();
      }
    }
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.diagnosis !== undefined) data.diagnosis = dto.diagnosis;
    if (dto.internalNotes !== undefined)
      data.internal_notes = dto.internalNotes;
    if (dto.assignedTo !== undefined) {
      data.mechanic = dto.assignedTo
        ? { connect: { id: dto.assignedTo } }
        : { disconnect: true };
    }
    if (dto.estimatedDate !== undefined) {
      data.estimated_date = new Date(dto.estimatedDate);
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data,
      include: INCLUDE_RELATIONS,
    });

    this.logger.info(
      {
        workOrderId: id,
        tenantId,
        status: workOrder.status,
      },
      'Work order updated',
    );

    return this.mapWorkOrder(workOrder);
  }

  async findByClient(clientId: string): Promise<WorkOrderResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertClientExists(clientId, tenantId);

    const workOrders = await this.prisma.workOrder.findMany({
      where: { tenant_id: tenantId, client_id: clientId },
      include: INCLUDE_RELATIONS,
      orderBy: { created_at: 'desc' },
    });

    return workOrders.map((wo) => this.mapWorkOrder(wo));
  }

  async findByVehicle(vehicleId: string): Promise<WorkOrderResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertVehicleExists(vehicleId, tenantId);

    const workOrders = await this.prisma.workOrder.findMany({
      where: { tenant_id: tenantId, vehicle_id: vehicleId },
      include: INCLUDE_RELATIONS,
      orderBy: { created_at: 'desc' },
    });

    return workOrders.map((wo) => this.mapWorkOrder(wo));
  }

  async addTask(
    workOrderId: string,
    dto: CreateTaskDto,
  ): Promise<WorkOrderTaskResponse> {
    const tenantId = this.tenantContext.getTenantId();
    await this.assertWorkOrderExists(workOrderId, tenantId);

    const lastTask = await this.prisma.workOrderTask.findFirst({
      where: { work_order_id: workOrderId },
      orderBy: { sort_order: 'desc' },
    });
    const sortOrder = (lastTask?.sort_order ?? 0) + 1;

    const task = await this.prisma.workOrderTask.create({
      data: {
        work_order_id: workOrderId,
        description: dto.description,
        labor_hours: dto.laborHours ?? 0,
        labor_cost: dto.laborCost ?? 0,
        sort_order: sortOrder,
      },
    });

    await this.recalculateTotals(workOrderId);

    this.logger.info(
      { workOrderId, taskId: task.id, tenantId },
      'Task added to work order',
    );

    return {
      id: task.id,
      description: task.description,
      isCompleted: task.is_completed,
      laborHours: Number(task.labor_hours),
      laborCost: Number(task.labor_cost),
      sortOrder: task.sort_order,
    };
  }

  async updateTask(
    workOrderId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<WorkOrderTaskResponse> {
    const tenantId = this.tenantContext.getTenantId();
    await this.assertWorkOrderExists(workOrderId, tenantId);

    const existing = await this.prisma.workOrderTask.findFirst({
      where: { id: taskId, work_order_id: workOrderId },
    });
    if (!existing) {
      throw new NotFoundException(
        'Tarea no encontrada en esta orden de trabajo',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isCompleted !== undefined) data.is_completed = dto.isCompleted;
    if (dto.laborHours !== undefined) data.labor_hours = dto.laborHours;
    if (dto.laborCost !== undefined) data.labor_cost = dto.laborCost;

    const task = await this.prisma.workOrderTask.update({
      where: { id: taskId },
      data,
    });

    await this.recalculateTotals(workOrderId);

    this.logger.info({ workOrderId, taskId, tenantId }, 'Task updated');

    return {
      id: task.id,
      description: task.description,
      isCompleted: task.is_completed,
      laborHours: Number(task.labor_hours),
      laborCost: Number(task.labor_cost),
      sortOrder: task.sort_order,
    };
  }

  async removeTask(workOrderId: string, taskId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    await this.assertWorkOrderExists(workOrderId, tenantId);

    const existing = await this.prisma.workOrderTask.findFirst({
      where: { id: taskId, work_order_id: workOrderId },
    });
    if (!existing) {
      throw new NotFoundException(
        'Tarea no encontrada en esta orden de trabajo',
      );
    }

    await this.prisma.workOrderTask.delete({ where: { id: taskId } });
    await this.recalculateTotals(workOrderId);

    this.logger.info(
      { workOrderId, taskId, tenantId },
      'Task removed from work order',
    );
  }

  async addPart(
    workOrderId: string,
    dto: AddPartDto,
  ): Promise<WorkOrderPartResponse> {
    const tenantId = this.tenantContext.getTenantId();
    await this.assertWorkOrderExists(workOrderId, tenantId);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenant_id: tenantId, is_active: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado o inactivo');
    }
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${dto.quantity}`,
      );
    }

    const part = await this.prisma.$transaction(async (tx) => {
      const previousStock = product.stock;
      const newStock = previousStock - dto.quantity;

      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          tenant_id: tenantId,
          product_id: dto.productId,
          type: StockMovementType.salida,
          quantity: dto.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          unit_cost: product.cost_price,
          reference: `OT-${workOrderId}`,
          notes: 'Descontado por uso en orden de trabajo',
        },
      });

      const created = await tx.workOrderPart.create({
        data: {
          work_order_id: workOrderId,
          product_id: dto.productId,
          quantity: dto.quantity,
          unit_price: product.sale_price,
          total: Number(product.sale_price) * dto.quantity,
        },
        include: { product: { select: { name: true, code: true } } },
      });

      return created;
    });

    await this.recalculateTotals(workOrderId);

    this.logger.info(
      { workOrderId, partId: part.id, productId: dto.productId, tenantId },
      'Part added to work order',
    );

    return {
      id: part.id,
      productId: part.product_id,
      productName: part.product.name,
      productCode: part.product.code,
      quantity: part.quantity,
      unitPrice: Number(part.unit_price),
      total: Number(part.total),
      createdAt: part.created_at.toISOString(),
    };
  }

  async removePart(workOrderId: string, partId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    await this.assertWorkOrderExists(workOrderId, tenantId);

    const part = await this.prisma.workOrderPart.findFirst({
      where: { id: partId, work_order_id: workOrderId },
      include: { product: true },
    });
    if (!part) {
      throw new NotFoundException(
        'Repuesto no encontrado en esta orden de trabajo',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const previousStock = part.product.stock;
      const newStock = previousStock + part.quantity;

      await tx.product.update({
        where: { id: part.product_id },
        data: { stock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          tenant_id: tenantId,
          product_id: part.product_id,
          type: StockMovementType.ingreso,
          quantity: part.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference: `OT-${workOrderId}`,
          notes: 'Restaurado por eliminación de repuesto de orden de trabajo',
        },
      });

      await tx.workOrderPart.delete({ where: { id: partId } });
    });

    await this.recalculateTotals(workOrderId);

    this.logger.info(
      { workOrderId, partId, tenantId },
      'Part removed from work order',
    );
  }

  private validateTransition(
    current: WorkOrderStatus,
    next: WorkOrderStatus,
  ): void {
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de "${current}" a "${next}"`,
      );
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OT-${year}-`;

    const lastOrder = await this.prisma.workOrder.findFirst({
      where: {
        tenant_id: tenantId,
        order_number: { startsWith: prefix },
      },
      orderBy: { order_number: 'desc' },
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.order_number.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  private async assertWorkOrderExists(
    workOrderId: string,
    tenantId: string,
  ): Promise<void> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenant_id: tenantId },
    });
    if (!wo) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }
  }

  private async recalculateTotals(workOrderId: string): Promise<void> {
    const tasks = await this.prisma.workOrderTask.findMany({
      where: { work_order_id: workOrderId },
    });
    const parts = await this.prisma.workOrderPart.findMany({
      where: { work_order_id: workOrderId },
    });

    const totalLabor = tasks.reduce((sum, t) => sum + Number(t.labor_cost), 0);
    const totalParts = parts.reduce((sum, p) => sum + Number(p.total), 0);
    const total = totalLabor + totalParts;

    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { total_labor: totalLabor, total_parts: totalParts, total },
    });
  }

  private async assertClientExists(
    clientId: string,
    tenantId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenant_id: tenantId, is_active: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado o inactivo');
    }
  }

  private async assertVehicleExists(
    vehicleId: string,
    tenantId: string,
  ): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenant_id: tenantId, is_active: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado o inactivo');
    }
  }

  private async assertMechanicExists(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId, is_active: true },
    });
    if (!user) {
      throw new NotFoundException('Mecánico no encontrado o inactivo');
    }
  }

  private mapWorkOrder(wo: {
    id: string;
    order_number: string;
    client_id: string;
    client: { name: string };
    vehicle_id: string;
    vehicle: { plate: string; brand: string; model: string; year: number };
    assigned_to: string | null;
    mechanic: { name: string } | null;
    status: WorkOrderStatus;
    priority: string;
    description: string;
    diagnosis: string | null;
    internal_notes: string | null;
    mileage_in: number | null;
    estimated_date: Date | null;
    completed_date: Date | null;
    delivered_date: Date | null;
    total_parts: Prisma.Decimal;
    total_labor: Prisma.Decimal;
    total: Prisma.Decimal;
    tasks: Array<{
      id: string;
      description: string;
      is_completed: boolean;
      labor_hours: Prisma.Decimal;
      labor_cost: Prisma.Decimal;
      sort_order: number;
    }>;
    parts: Array<{
      id: string;
      product_id: string;
      product: { name: string; code: string };
      quantity: number;
      unit_price: Prisma.Decimal;
      total: Prisma.Decimal;
      created_at: Date;
    }>;
    created_at: Date;
    updated_at: Date;
  }): WorkOrderResponse {
    return {
      id: wo.id,
      orderNumber: wo.order_number,
      clientId: wo.client_id,
      clientName: wo.client.name,
      vehicleId: wo.vehicle_id,
      vehiclePlate: wo.vehicle.plate,
      vehicleDescription: `${wo.vehicle.brand} ${wo.vehicle.model} (${wo.vehicle.year})`,
      assignedTo: wo.assigned_to,
      mechanicName: wo.mechanic?.name ?? null,
      status: wo.status,
      priority: wo.priority as WorkOrderResponse['priority'],
      description: wo.description,
      diagnosis: wo.diagnosis,
      internalNotes: wo.internal_notes,
      mileageIn: wo.mileage_in,
      estimatedDate: wo.estimated_date?.toISOString() ?? null,
      completedDate: wo.completed_date?.toISOString() ?? null,
      deliveredDate: wo.delivered_date?.toISOString() ?? null,
      totalParts: Number(wo.total_parts),
      totalLabor: Number(wo.total_labor),
      total: Number(wo.total),
      tasks: wo.tasks.map(
        (t): WorkOrderTaskResponse => ({
          id: t.id,
          description: t.description,
          isCompleted: t.is_completed,
          laborHours: Number(t.labor_hours),
          laborCost: Number(t.labor_cost),
          sortOrder: t.sort_order,
        }),
      ),
      parts: wo.parts.map(
        (p): WorkOrderPartResponse => ({
          id: p.id,
          productId: p.product_id,
          productName: p.product.name,
          productCode: p.product.code,
          quantity: p.quantity,
          unitPrice: Number(p.unit_price),
          total: Number(p.total),
          createdAt: p.created_at.toISOString(),
        }),
      ),
      createdAt: wo.created_at.toISOString(),
      updatedAt: wo.updated_at.toISOString(),
    };
  }
}
