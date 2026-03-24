import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicWorkOrderResponse } from './interfaces/public-work-order.interface';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.recepcion]: 'Recepción',
  [WorkOrderStatus.diagnostico]: 'Diagnóstico',
  [WorkOrderStatus.aprobado]: 'Aprobado',
  [WorkOrderStatus.en_progreso]: 'En Progreso',
  [WorkOrderStatus.completado]: 'Completado',
  [WorkOrderStatus.entregado]: 'Entregado',
  [WorkOrderStatus.cancelado]: 'Cancelado',
};

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findWorkOrderByNumber(
    orderNumber: string,
  ): Promise<PublicWorkOrderResponse> {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { order_number: orderNumber },
      select: {
        order_number: true,
        status: true,
        priority: true,
        description: true,
        estimated_date: true,
        completed_date: true,
        delivered_date: true,
        created_at: true,
        vehicle: {
          select: { plate: true, brand: true, model: true, year: true },
        },
        tenant: { select: { name: true } },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const descriptionPreview = workOrder.description.substring(0, 200);

    return {
      orderNumber: workOrder.order_number,
      status: workOrder.status,
      statusLabel: STATUS_LABELS[workOrder.status],
      priority: workOrder.priority,
      vehiclePlate: workOrder.vehicle.plate,
      vehicleDescription: `${workOrder.vehicle.brand} ${workOrder.vehicle.model} (${workOrder.vehicle.year})`,
      description: descriptionPreview,
      createdAt: workOrder.created_at.toISOString(),
      estimatedDate: workOrder.estimated_date?.toISOString() ?? null,
      completedDate: workOrder.completed_date?.toISOString() ?? null,
      deliveredDate: workOrder.delivered_date?.toISOString() ?? null,
      tenantName: workOrder.tenant.name,
    };
  }
}
