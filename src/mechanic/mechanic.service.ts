import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import {
  MechanicSummary,
  MechanicTaskItem,
  MechanicWorkOrderItem,
} from './interfaces/mechanic-response.interface';

const ACTIVE_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.en_progreso,
  WorkOrderStatus.aprobado,
];

@Injectable()
export class MechanicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async getMyTasks(userId: string): Promise<MechanicWorkOrderItem[]> {
    const tenantId = this.tenantContext.getTenantId();

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        tenant_id: tenantId,
        assigned_to: userId,
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        client: { select: { name: true } },
        vehicle: {
          select: { plate: true, brand: true, model: true, year: true },
        },
        tasks: { orderBy: { sort_order: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
    });

    return workOrders.map((wo) => this.mapWorkOrderItem(wo));
  }

  async toggleTaskComplete(
    userId: string,
    taskId: string,
  ): Promise<MechanicTaskItem> {
    const tenantId = this.tenantContext.getTenantId();

    const task = await this.prisma.workOrderTask.findFirst({
      where: { id: taskId },
      include: {
        work_order: {
          select: { tenant_id: true, assigned_to: true },
        },
      },
    });

    if (
      !task ||
      task.work_order.tenant_id !== tenantId ||
      task.work_order.assigned_to !== userId
    ) {
      throw new NotFoundException(
        'Tarea no encontrada o no asignada a este mecánico',
      );
    }

    const updated = await this.prisma.workOrderTask.update({
      where: { id: taskId },
      data: { is_completed: !task.is_completed },
    });

    return {
      id: updated.id,
      description: updated.description,
      isCompleted: updated.is_completed,
      laborHours: Number(updated.labor_hours),
      laborCost: Number(updated.labor_cost),
      sortOrder: updated.sort_order,
    };
  }

  async getSummary(userId: string): Promise<MechanicSummary> {
    const tenantId = this.tenantContext.getTenantId();

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const [assignedWorkOrders, completedToday, pendingTasksResult] =
      await Promise.all([
        this.prisma.workOrder.count({
          where: {
            tenant_id: tenantId,
            assigned_to: userId,
            status: { in: ACTIVE_STATUSES },
          },
        }),
        this.prisma.workOrder.count({
          where: {
            tenant_id: tenantId,
            assigned_to: userId,
            status: WorkOrderStatus.completado,
            completed_date: { gte: startOfToday },
          },
        }),
        this.prisma.workOrderTask.count({
          where: {
            is_completed: false,
            work_order: {
              tenant_id: tenantId,
              assigned_to: userId,
              status: { in: ACTIVE_STATUSES },
            },
          },
        }),
      ]);

    return {
      assignedCount: assignedWorkOrders,
      completedToday,
      pendingTasks: pendingTasksResult,
    };
  }

  private mapWorkOrderItem(wo: {
    id: string;
    order_number: string;
    client: { name: string };
    vehicle: { plate: string; brand: string; model: string; year: number };
    status: WorkOrderStatus;
    description: string;
    priority: string;
    tasks: Array<{
      id: string;
      description: string;
      is_completed: boolean;
      labor_hours: { toNumber?: () => number } | number;
      labor_cost: { toNumber?: () => number } | number;
      sort_order: number;
    }>;
    created_at: Date;
  }): MechanicWorkOrderItem {
    return {
      id: wo.id,
      orderNumber: wo.order_number,
      clientName: wo.client.name,
      vehiclePlate: wo.vehicle.plate,
      vehicleDescription: `${wo.vehicle.brand} ${wo.vehicle.model} (${wo.vehicle.year})`,
      status: wo.status,
      description: wo.description,
      priority: wo.priority,
      tasks: wo.tasks.map((t) => ({
        id: t.id,
        description: t.description,
        isCompleted: t.is_completed,
        laborHours: Number(t.labor_hours),
        laborCost: Number(t.labor_cost),
        sortOrder: t.sort_order,
      })),
      createdAt: wo.created_at.toISOString(),
    };
  }
}
