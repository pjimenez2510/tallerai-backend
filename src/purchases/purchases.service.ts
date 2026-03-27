import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  PurchaseOrderItemResponse,
  PurchaseOrderResponse,
} from './interfaces/purchase-response.interface';
import {
  PaginationDto,
  buildPaginatedResponse,
} from '../common/dto/pagination.dto';
import { PaginatedData } from '../common/interfaces/api-response.interface';

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{
  include: {
    items: {
      include: { product: { select: { name: true; code: true } } };
    };
  };
}>;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(PurchasesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    // Validate all products exist
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenant_id: tenantId, is_active: true },
      });
      if (!product) {
        throw new NotFoundException(
          `Producto con ID ${item.productId} no encontrado o inactivo`,
        );
      }
    }

    const orderNumber = await this.generateOrderNumber(tenantId);
    const total = dto.items.reduce(
      (sum, i) => sum + i.unitCost * i.quantity,
      0,
    );

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        tenant_id: tenantId,
        order_number: orderNumber,
        supplier: dto.supplier,
        notes: dto.notes,
        total,
        status: 'pendiente',
        items: {
          create: dto.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total: item.unitCost * item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: { product: { select: { name: true, code: true } } },
        },
      },
    });

    this.logger.info(
      { purchaseOrderId: purchaseOrder.id, tenantId, orderNumber },
      'Purchase order created',
    );

    return this.mapPurchaseOrder(purchaseOrder);
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedData<PurchaseOrderResponse>> {
    const tenantId = this.tenantContext.getTenantId();

    const where = { tenant_id: tenantId };
    const include = {
      items: {
        include: { product: { select: { name: true, code: true } } },
      },
    };

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return buildPaginatedResponse(
      orders.map((o) => this.mapPurchaseOrder(o)),
      total,
      pagination,
    );
  }

  async findOne(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        items: {
          include: { product: { select: { name: true, code: true } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return this.mapPurchaseOrder(order);
  }

  async receive(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (order.status !== 'pendiente') {
      throw new BadRequestException(
        `La orden ya está en estado "${order.status}" y no puede recibirse`,
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = item.product;
        const oldStock = product.stock;
        const oldCost = Number(product.cost_price);
        const qty = item.quantity;
        const unitCost = Number(item.unit_cost);

        const newStock = oldStock + qty;
        const newCost =
          oldStock === 0
            ? unitCost
            : (oldStock * oldCost + qty * unitCost) / newStock;

        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock, cost_price: newCost },
        });

        await tx.stockMovement.create({
          data: {
            tenant_id: tenantId,
            product_id: product.id,
            type: StockMovementType.ingreso,
            quantity: qty,
            previous_stock: oldStock,
            new_stock: newStock,
            unit_cost: unitCost,
            reference: `OC-${order.order_number}`,
            notes: 'Ingreso por recepción de orden de compra',
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: 'recibida', received_at: new Date() },
        include: {
          items: {
            include: { product: { select: { name: true, code: true } } },
          },
        },
      });
    });

    this.logger.info(
      { purchaseOrderId: id, tenantId },
      'Purchase order received — stock and costs updated',
    );

    return this.mapPurchaseOrder(updatedOrder);
  }

  async cancel(id: string): Promise<PurchaseOrderResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        items: {
          include: { product: { select: { name: true, code: true } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (order.status !== 'pendiente') {
      throw new BadRequestException(
        `Solo se pueden cancelar órdenes en estado "pendiente". Estado actual: "${order.status}"`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'cancelada' },
      include: {
        items: {
          include: { product: { select: { name: true, code: true } } },
        },
      },
    });

    this.logger.info(
      { purchaseOrderId: id, tenantId },
      'Purchase order cancelled',
    );

    return this.mapPurchaseOrder(updated);
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OC-${year}-`;

    const lastOrder = await this.prisma.purchaseOrder.findFirst({
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

    const orderNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    // Verify uniqueness to avoid race conditions
    const conflict = await this.prisma.purchaseOrder.findFirst({
      where: { tenant_id: tenantId, order_number: orderNumber },
    });
    if (conflict) {
      throw new ConflictException(
        'Error generando número de orden, intente nuevamente',
      );
    }

    return orderNumber;
  }

  private mapPurchaseOrder(
    order: PurchaseOrderWithItems,
  ): PurchaseOrderResponse {
    return {
      id: order.id,
      orderNumber: order.order_number,
      supplier: order.supplier,
      notes: order.notes,
      total: Number(order.total),
      status: order.status,
      receivedAt: order.received_at?.toISOString() ?? null,
      items: order.items.map(
        (item): PurchaseOrderItemResponse => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product.name,
          productCode: item.product.code,
          quantity: item.quantity,
          unitCost: Number(item.unit_cost),
          total: Number(item.total),
        }),
      ),
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
    };
  }
}
