import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PublicVehiclePortalResponse,
  PublicWorkOrderResponse,
} from './interfaces/public-work-order.interface';

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

  async findVehicleByPlate(
    plate: string,
  ): Promise<PublicVehiclePortalResponse> {
    const normalizedPlate = plate.toUpperCase().trim();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { plate: normalizedPlate },
      select: {
        plate: true,
        brand: true,
        model: true,
        year: true,
        color: true,
        tenant: { select: { name: true } },
        work_orders: {
          select: {
            order_number: true,
            status: true,
            description: true,
            created_at: true,
            completed_date: true,
            delivered_date: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return {
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      tenantName: vehicle.tenant.name,
      workOrders: vehicle.work_orders.map((wo) => ({
        orderNumber: wo.order_number,
        status: wo.status,
        statusLabel: STATUS_LABELS[wo.status],
        description: wo.description.substring(0, 150),
        createdAt: wo.created_at.toISOString(),
        completedDate: wo.completed_date?.toISOString() ?? null,
        deliveredDate: wo.delivered_date?.toISOString() ?? null,
      })),
    };
  }
}
