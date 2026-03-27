import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { PurchasesService } from './purchases.service';

const TENANT_ID = 'tenant-001';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'product-001',
    tenant_id: TENANT_ID,
    code: 'REP-001',
    name: 'Filtro de aceite',
    stock: 10,
    cost_price: 8.5,
    is_active: true,
    ...overrides,
  };
}

function makeOrderItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-001',
    purchase_order_id: 'order-001',
    product_id: 'product-001',
    quantity: 5,
    unit_cost: 8.5,
    total: 42.5,
    product: { name: 'Filtro de aceite', code: 'REP-001' },
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-001',
    tenant_id: TENANT_ID,
    order_number: 'OC-2026-0001',
    supplier: 'Repuestos Ecuador S.A.',
    notes: null,
    total: 42.5,
    status: 'pendiente',
    received_at: null,
    items: [makeOrderItem()],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  purchaseOrder: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  stockMovement: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('PurchasesService', () => {
  let service: PurchasesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PurchasesService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto = {
      supplier: 'Repuestos Ecuador S.A.',
      items: [{ productId: 'product-001', quantity: 5, unitCost: 8.5 }],
    };

    it('should create a purchase order successfully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.purchaseOrder.findFirst
        .mockResolvedValueOnce(null) // last order for number generation
        .mockResolvedValueOnce(null); // conflict check
      mockPrisma.purchaseOrder.create.mockResolvedValue(makeOrder());

      const result = await service.create(dto);

      expect(result.id).toBe('order-001');
      expect(result.supplier).toBe('Repuestos Ecuador S.A.');
      expect(result.status).toBe('pendiente');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const pagination = { page: 1, limit: 20, skip: 0 };

    it('should return paginated purchase orders for tenant', async () => {
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([makeOrder()]);
      mockPrisma.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.findAll(pagination);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: TENANT_ID },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a purchase order by id', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(makeOrder());

      const result = await service.findOne('order-001');

      expect(result.id).toBe('order-001');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('receive', () => {
    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.receive('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order is not pendiente', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(
        makeOrder({ status: 'recibida' }),
      );

      await expect(service.receive('order-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should receive order and update stock with weighted average cost', async () => {
      const orderWithProducts = makeOrder({
        items: [
          {
            ...makeOrderItem(),
            product: makeProduct({ stock: 10, cost_price: 8.0 }),
          },
        ],
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(orderWithProducts);

      const receivedOrder = makeOrder({
        status: 'recibida',
        received_at: new Date(),
      });
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return fn({
            product: { update: jest.fn().mockResolvedValue({}) },
            stockMovement: { create: jest.fn().mockResolvedValue({}) },
            purchaseOrder: {
              update: jest.fn().mockResolvedValue(receivedOrder),
            },
          } as unknown as typeof mockPrisma);
        },
      );

      const result = await service.receive('order-001');

      expect(result.status).toBe('recibida');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should compute weighted average cost correctly', async () => {
      // oldStock=10, oldCost=8.0, qty=5, unitCost=11.0
      // newCost = (10*8.0 + 5*11.0) / 15 = (80+55)/15 = 135/15 = 9.0
      const orderWithProducts = makeOrder({
        items: [
          {
            ...makeOrderItem(),
            quantity: 5,
            unit_cost: 11.0,
            product: makeProduct({ stock: 10, cost_price: 8.0 }),
          },
        ],
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(orderWithProducts);

      const capturedUpdates: Array<{ where: unknown; data: unknown }> = [];
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          const mockProductUpdate = jest
            .fn()
            .mockImplementation((args: { where: unknown; data: unknown }) => {
              capturedUpdates.push(args);
              return Promise.resolve({});
            });
          const receivedOrder = makeOrder({
            status: 'recibida',
            received_at: new Date(),
          });
          return fn({
            product: { update: mockProductUpdate },
            stockMovement: { create: jest.fn().mockResolvedValue({}) },
            purchaseOrder: {
              update: jest.fn().mockResolvedValue(receivedOrder),
            },
          } as unknown as typeof mockPrisma);
        },
      );

      await service.receive('order-001');

      const productUpdate = capturedUpdates[0];
      const updatedData = productUpdate.data as {
        stock: number;
        cost_price: number;
      };
      expect(updatedData.stock).toBe(15);
      expect(Number(updatedData.cost_price.toFixed(4))).toBeCloseTo(9.0, 4);
    });

    it('should use unit_cost as new cost when old stock is 0', async () => {
      const orderWithProducts = makeOrder({
        items: [
          {
            ...makeOrderItem(),
            quantity: 5,
            unit_cost: 12.0,
            product: makeProduct({ stock: 0, cost_price: 0 }),
          },
        ],
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(orderWithProducts);

      const capturedUpdates: Array<{ where: unknown; data: unknown }> = [];
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          const mockProductUpdate = jest
            .fn()
            .mockImplementation((args: { where: unknown; data: unknown }) => {
              capturedUpdates.push(args);
              return Promise.resolve({});
            });
          const receivedOrder = makeOrder({
            status: 'recibida',
            received_at: new Date(),
          });
          return fn({
            product: { update: mockProductUpdate },
            stockMovement: { create: jest.fn().mockResolvedValue({}) },
            purchaseOrder: {
              update: jest.fn().mockResolvedValue(receivedOrder),
            },
          } as unknown as typeof mockPrisma);
        },
      );

      await service.receive('order-001');

      const updatedData = capturedUpdates[0].data as { cost_price: number };
      expect(updatedData.cost_price).toBe(12.0);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending order', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.purchaseOrder.update.mockResolvedValue(
        makeOrder({ status: 'cancelada' }),
      );

      const result = await service.cancel('order-001');

      expect(result.status).toBe('cancelada');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order is not pendiente', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(
        makeOrder({ status: 'recibida' }),
      );

      await expect(service.cancel('order-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('stock movement type in receive', () => {
    it('should create ingreso stock movement when receiving', async () => {
      const orderWithProducts = makeOrder({
        items: [
          {
            ...makeOrderItem(),
            product: makeProduct({ stock: 5, cost_price: 8.0 }),
          },
        ],
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(orderWithProducts);

      const capturedMovements: Array<{ data: unknown }> = [];
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          const mockMovementCreate = jest
            .fn()
            .mockImplementation((args: { data: unknown }) => {
              capturedMovements.push(args);
              return Promise.resolve({});
            });
          const receivedOrder = makeOrder({
            status: 'recibida',
            received_at: new Date(),
          });
          return fn({
            product: { update: jest.fn().mockResolvedValue({}) },
            stockMovement: { create: mockMovementCreate },
            purchaseOrder: {
              update: jest.fn().mockResolvedValue(receivedOrder),
            },
          } as unknown as typeof mockPrisma);
        },
      );

      await service.receive('order-001');

      const movementData = capturedMovements[0].data as { type: string };
      expect(movementData.type).toBe(StockMovementType.ingreso);
    });
  });
});
