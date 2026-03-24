import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
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
      createdAt: wo.created_at.toISOString(),
      updatedAt: wo.updated_at.toISOString(),
    };
  }
}
