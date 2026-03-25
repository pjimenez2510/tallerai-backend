import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import {
  DashboardMetrics,
  MonthlyTrendItem,
  ProductivityMetrics,
  RecentWorkOrderItem,
  StatusDistributionItem,
  TopMechanicItem,
  WorkOrdersByStatus,
} from './interfaces/dashboard-metrics.interface';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async getMetrics(): Promise<DashboardMetrics> {
    const tenantId = this.tenantContext.getTenantId();

    const [
      workOrderGroups,
      totalClients,
      newThisMonthClients,
      totalVehicles,
      products,
      revenueResult,
      recentWorkOrders,
      completedByMechanic,
    ] = await Promise.all([
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { tenant_id: tenantId },
        _count: { status: true },
      }),
      this.prisma.client.count({
        where: { tenant_id: tenantId, is_active: true },
      }),
      this.prisma.client.count({
        where: {
          tenant_id: tenantId,
          is_active: true,
          created_at: { gte: this.getStartOfCurrentMonth() },
        },
      }),
      this.prisma.vehicle.count({
        where: { tenant_id: tenantId, is_active: true },
      }),
      this.prisma.product.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { stock: true, sale_price: true, min_stock: true },
      }),
      this.prisma.workOrder.aggregate({
        where: {
          tenant_id: tenantId,
          status: {
            in: [WorkOrderStatus.completado, WorkOrderStatus.entregado],
          },
        },
        _sum: { total_parts: true, total_labor: true, total: true },
      }),
      this.prisma.workOrder.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          order_number: true,
          status: true,
          created_at: true,
          client: { select: { name: true } },
          vehicle: { select: { plate: true } },
        },
      }),
      this.prisma.workOrder.groupBy({
        by: ['assigned_to'],
        where: {
          tenant_id: tenantId,
          status: WorkOrderStatus.completado,
          assigned_to: { not: null },
        },
        _count: { assigned_to: true },
        orderBy: { _count: { assigned_to: 'desc' } },
        take: 3,
      }),
    ]);

    const typedGroups = (
      workOrderGroups as Array<{
        status: WorkOrderStatus;
        _count: { status: number };
      }>
    ).map((g) => ({ status: g.status, count: g._count.status }));

    const byStatus = this.buildByStatusMap(typedGroups);
    const statusValues = Object.values(byStatus) as number[];
    const totalWorkOrders = statusValues.reduce(
      (sum: number, count: number) => sum + count,
      0,
    );

    const totalProducts = products.length;
    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.sale_price) * p.stock,
      0,
    );
    const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

    const recentWorkOrdersMapped: RecentWorkOrderItem[] = recentWorkOrders.map(
      (wo) => ({
        orderNumber: wo.order_number,
        clientName: wo.client.name,
        vehiclePlate: wo.vehicle.plate,
        status: wo.status,
        createdAt: wo.created_at.toISOString(),
      }),
    );

    const mechanicIds = (
      completedByMechanic as Array<{
        assigned_to: string | null;
        _count: { assigned_to: number };
      }>
    )
      .filter((g) => g.assigned_to !== null)
      .map((g) => g.assigned_to as string);

    const mechanicUsers = mechanicIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: mechanicIds } },
          select: { id: true, name: true },
        })
      : [];

    const mechanicNameMap = new Map(mechanicUsers.map((u) => [u.id, u.name]));

    const topMechanics: TopMechanicItem[] = (
      completedByMechanic as Array<{
        assigned_to: string | null;
        _count: { assigned_to: number };
      }>
    )
      .filter((g) => g.assigned_to !== null)
      .map((g) => ({
        name: mechanicNameMap.get(g.assigned_to as string) ?? 'Unknown',
        completedCount: g._count.assigned_to,
      }));

    return {
      workOrders: { total: totalWorkOrders, byStatus },
      clients: { total: totalClients, newThisMonth: newThisMonthClients },
      vehicles: { total: totalVehicles },
      inventory: { totalProducts, totalValue, lowStockCount },
      revenue: {
        totalParts: Number(revenueResult._sum.total_parts ?? 0),
        totalLabor: Number(revenueResult._sum.total_labor ?? 0),
        total: Number(revenueResult._sum.total ?? 0),
      },
      recentWorkOrders: recentWorkOrdersMapped,
      topMechanics,
    };
  }

  async getProductivity(): Promise<ProductivityMetrics> {
    const tenantId = this.tenantContext.getTenantId();
    const now = new Date();

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [completedOrders, thisMonthCount, lastMonthCount, statusGroups] =
      await Promise.all([
        this.prisma.workOrder.findMany({
          where: {
            tenant_id: tenantId,
            status: {
              in: [WorkOrderStatus.completado, WorkOrderStatus.entregado],
            },
            completed_date: { not: null },
          },
          select: { created_at: true, completed_date: true },
        }),
        this.prisma.workOrder.count({
          where: {
            tenant_id: tenantId,
            created_at: { gte: startOfThisMonth },
          },
        }),
        this.prisma.workOrder.count({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: startOfLastMonth,
              lt: startOfThisMonth,
            },
          },
        }),
        this.prisma.workOrder.groupBy({
          by: ['status'],
          where: { tenant_id: tenantId },
          _count: { status: true },
        }),
      ]);

    const avgCompletionDays = this.calculateAvgCompletionDays(completedOrders);
    const monthlyTrend = await this.buildMonthlyTrend(tenantId, now);

    const statusDistribution: StatusDistributionItem[] = (
      statusGroups as Array<{
        status: string;
        _count: { status: number };
      }>
    ).map((g) => ({ status: g.status, count: g._count.status }));

    return {
      avgCompletionDays,
      workOrdersThisMonth: thisMonthCount,
      workOrdersLastMonth: lastMonthCount,
      monthlyTrend,
      statusDistribution,
    };
  }

  private calculateAvgCompletionDays(
    orders: Array<{ created_at: Date; completed_date: Date | null }>,
  ): number {
    const completed = orders.filter((o) => o.completed_date !== null);
    if (completed.length === 0) return 0;

    const totalMs = completed.reduce((sum, o) => {
      const diff =
        (o.completed_date as Date).getTime() - o.created_at.getTime();
      return sum + diff;
    }, 0);

    const avgMs = totalMs / completed.length;
    return Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10;
  }

  private async buildMonthlyTrend(
    tenantId: string,
    now: Date,
  ): Promise<MonthlyTrendItem[]> {
    const months: MonthlyTrendItem[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const count = await this.prisma.workOrder.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: monthStart, lt: monthEnd },
        },
      });

      const monthLabel = monthStart.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'short',
      });

      months.push({ month: monthLabel, count });
    }

    return months;
  }

  private buildByStatusMap(
    groups: Array<{ status: WorkOrderStatus; count: number }>,
  ): WorkOrdersByStatus {
    const map: WorkOrdersByStatus = {
      recepcion: 0,
      diagnostico: 0,
      aprobado: 0,
      en_progreso: 0,
      completado: 0,
      entregado: 0,
      cancelado: 0,
    };

    for (const group of groups) {
      map[group.status] = group.count;
    }

    return map;
  }

  private getStartOfCurrentMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
