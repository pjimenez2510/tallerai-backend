import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import {
  DashboardMetrics,
  RecentWorkOrderItem,
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
