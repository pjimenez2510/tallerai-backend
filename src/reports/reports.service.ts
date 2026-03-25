import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { WorkOrderReportDto } from './dto/work-order-report.dto';
import {
  ClientsReportResponse,
  InventoryReportResponse,
  WorkOrderReportResponse,
} from './interfaces/report-response.interface';

const MS_PER_DAY = 86_400_000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(ReportsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getWorkOrdersReport(
    dto: WorkOrderReportDto,
  ): Promise<WorkOrderReportResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const where: Record<string, unknown> = { tenant_id: tenantId };
    if (dto.from || dto.to) {
      const createdAt: Record<string, Date> = {};
      if (dto.from) createdAt.gte = new Date(dto.from);
      if (dto.to) {
        const toDate = new Date(dto.to);
        toDate.setHours(23, 59, 59, 999);
        createdAt.lte = toDate;
      }
      where.created_at = createdAt;
    }
    if (dto.status) {
      where.status = dto.status as WorkOrderStatus;
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where,
      include: {
        client: { select: { name: true, document_number: true } },
        vehicle: { select: { plate: true, brand: true, model: true } },
        mechanic: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const headers = [
      'N° Orden',
      'Cliente',
      'Documento',
      'Vehículo',
      'Placa',
      'Mecánico',
      'Estado',
      'Prioridad',
      'Total Repuestos',
      'Total Mano de Obra',
      'Total',
      'Fecha Creación',
      'Fecha Completado',
    ];

    const rows = workOrders.map((wo) => [
      wo.order_number,
      wo.client.name,
      wo.client.document_number,
      `${wo.vehicle.brand} ${wo.vehicle.model}`,
      wo.vehicle.plate,
      wo.mechanic?.name ?? '',
      wo.status,
      wo.priority,
      wo.total_parts.toString(),
      wo.total_labor.toString(),
      wo.total.toString(),
      wo.created_at.toISOString().split('T')[0] ?? '',
      wo.completed_date
        ? (wo.completed_date.toISOString().split('T')[0] ?? '')
        : '',
    ]);

    const completed = workOrders.filter(
      (wo) =>
        wo.status === WorkOrderStatus.completado ||
        wo.status === WorkOrderStatus.entregado,
    );

    const revenue = completed.reduce((sum, wo) => sum + Number(wo.total), 0);

    const avgDays = this.calculateAvgDays(completed);

    this.logger.info(
      { tenantId, count: workOrders.length },
      'Work orders report generated',
    );

    return {
      headers,
      rows,
      summary: {
        total: workOrders.length,
        completed: completed.length,
        avgDays,
        revenue,
      },
    };
  }

  async getInventoryReport(): Promise<InventoryReportResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const products = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'Código',
      'Nombre',
      'Categoría',
      'Marca',
      'Unidad',
      'Stock',
      'Stock Mínimo',
      'Precio Costo',
      'Precio Venta',
      'Valor Total',
      'Proveedor',
      'Ubicación',
    ];

    const rows = products.map((p) => [
      p.code,
      p.name,
      p.category ?? '',
      p.brand ?? '',
      p.unit,
      p.stock.toString(),
      p.min_stock.toString(),
      p.cost_price.toString(),
      p.sale_price.toString(),
      (Number(p.cost_price) * p.stock).toFixed(2),
      p.supplier ?? '',
      p.location ?? '',
    ]);

    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.cost_price) * p.stock,
      0,
    );

    const lowStock = products.filter((p) => p.stock <= p.min_stock).length;

    this.logger.info(
      { tenantId, count: products.length },
      'Inventory report generated',
    );

    return {
      headers,
      rows,
      summary: {
        totalProducts: products.length,
        totalValue,
        lowStock,
      },
    };
  }

  async getClientsReport(): Promise<ClientsReportResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const clients = await this.prisma.client.findMany({
      where: { tenant_id: tenantId, is_active: true },
      include: {
        _count: { select: { work_orders: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'Nombre',
      'Tipo Documento',
      'Documento',
      'Email',
      'Teléfono',
      'Dirección',
      'OTs Total',
      'Fecha Registro',
    ];

    const rows = clients.map((c) => [
      c.name,
      c.document_type,
      c.document_number,
      c.email ?? '',
      c.phone ?? '',
      c.address ?? '',
      c._count.work_orders.toString(),
      c.created_at.toISOString().split('T')[0] ?? '',
    ]);

    const withEmail = clients.filter((c) => !!c.email).length;
    const withPhone = clients.filter((c) => !!c.phone).length;

    this.logger.info(
      { tenantId, count: clients.length },
      'Clients report generated',
    );

    return {
      headers,
      rows,
      summary: {
        total: clients.length,
        withEmail,
        withPhone,
      },
    };
  }

  private calculateAvgDays(
    completed: Array<{ created_at: Date; completed_date: Date | null }>,
  ): number {
    const withCompletedDate = completed.filter((wo) => wo.completed_date);
    if (withCompletedDate.length === 0) return 0;

    const totalDays = withCompletedDate.reduce((sum, wo) => {
      const diff =
        (wo.completed_date!.getTime() - wo.created_at.getTime()) / MS_PER_DAY;
      return sum + diff;
    }, 0);

    return Math.round((totalDays / withCompletedDate.length) * 10) / 10;
  }
}
