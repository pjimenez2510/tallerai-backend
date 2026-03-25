import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { ReportsService } from './reports.service';

const mockPrisma = {
  workOrder: {
    findMany: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  client: {
    findMany: jest.fn(),
  },
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const TENANT_ID = 'tenant-001';

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

function makeWorkOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wo-001',
    order_number: 'OT-001',
    tenant_id: TENANT_ID,
    status: 'completado',
    priority: 'normal',
    total_parts: '50.00',
    total_labor: '100.00',
    total: '150.00',
    created_at: new Date('2026-01-01'),
    completed_date: new Date('2026-01-03'),
    client: { name: 'Carlos Mendoza', document_number: '0912345678' },
    vehicle: { plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla' },
    mechanic: { name: 'Juan Pérez' },
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'prod-001',
    code: 'P001',
    name: 'Filtro de aceite',
    category: 'Filtros',
    brand: 'Purolator',
    unit: 'unidad',
    stock: 10,
    min_stock: 5,
    cost_price: '8.50',
    sale_price: '12.00',
    supplier: 'Proveedor A',
    location: 'A1',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'client-001',
    name: 'Carlos Mendoza',
    document_type: 'cedula',
    document_number: '0912345678',
    email: 'carlos@email.com',
    phone: '0999999999',
    address: 'Av. Principal 123',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    _count: { work_orders: 3 },
    ...overrides,
  };
}

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('getWorkOrdersReport', () => {
    it('should return work orders report with correct headers', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([makeWorkOrder()]);

      const result = await service.getWorkOrdersReport({});

      expect(result.headers).toContain('N° Orden');
      expect(result.headers).toContain('Cliente');
      expect(result.headers).toContain('Total');
      expect(result.rows).toHaveLength(1);
    });

    it('should calculate revenue from completed/entregado orders', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        makeWorkOrder({ status: 'completado', total: '150.00' }),
        makeWorkOrder({
          id: 'wo-002',
          status: 'entregado',
          total: '200.00',
        }),
        makeWorkOrder({ id: 'wo-003', status: 'recepcion', total: '100.00' }),
      ]);

      const result = await service.getWorkOrdersReport({});

      expect(result.summary.total).toBe(3);
      expect(result.summary.completed).toBe(2);
      expect(result.summary.revenue).toBe(350);
    });

    it('should calculate avgDays for completed orders', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        makeWorkOrder({
          status: 'completado',
          created_at: new Date('2026-01-01'),
          completed_date: new Date('2026-01-03'),
        }),
      ]);

      const result = await service.getWorkOrdersReport({});

      expect(result.summary.avgDays).toBe(2);
    });

    it('should return avgDays 0 when no completed orders', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        makeWorkOrder({ status: 'recepcion', completed_date: null }),
      ]);

      const result = await service.getWorkOrdersReport({});

      expect(result.summary.avgDays).toBe(0);
    });

    it('should filter by status when provided', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await service.getWorkOrdersReport({ status: 'completado' });

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'completado' }) as unknown,
        }) as unknown,
      );
    });

    it('should filter by date range when provided', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await service.getWorkOrdersReport({
        from: '2026-01-01',
        to: '2026-03-31',
      });

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.objectContaining({
              gte: new Date('2026-01-01'),
            }) as unknown,
          }) as unknown,
        }) as unknown,
      );
    });
  });

  describe('getInventoryReport', () => {
    it('should return inventory report with correct headers', async () => {
      mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

      const result = await service.getInventoryReport();

      expect(result.headers).toContain('Código');
      expect(result.headers).toContain('Stock');
      expect(result.headers).toContain('Valor Total');
      expect(result.rows).toHaveLength(1);
    });

    it('should calculate totalValue correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct({ cost_price: '8.50', stock: 10 }),
        makeProduct({ id: 'prod-002', cost_price: '20.00', stock: 5 }),
      ]);

      const result = await service.getInventoryReport();

      expect(result.summary.totalValue).toBe(185);
    });

    it('should count low stock products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct({ stock: 3, min_stock: 5 }),
        makeProduct({ id: 'prod-002', stock: 10, min_stock: 5 }),
        makeProduct({ id: 'prod-003', stock: 5, min_stock: 5 }),
      ]);

      const result = await service.getInventoryReport();

      expect(result.summary.lowStock).toBe(2);
    });
  });

  describe('getClientsReport', () => {
    it('should return clients report with correct headers', async () => {
      mockPrisma.client.findMany.mockResolvedValue([makeClient()]);

      const result = await service.getClientsReport();

      expect(result.headers).toContain('Nombre');
      expect(result.headers).toContain('Email');
      expect(result.headers).toContain('OTs Total');
      expect(result.rows).toHaveLength(1);
    });

    it('should count clients with email and phone', async () => {
      mockPrisma.client.findMany.mockResolvedValue([
        makeClient({ email: 'a@a.com', phone: '099' }),
        makeClient({ id: 'c-002', email: null, phone: '098' }),
        makeClient({ id: 'c-003', email: 'b@b.com', phone: null }),
        makeClient({ id: 'c-004', email: null, phone: null }),
      ]);

      const result = await service.getClientsReport();

      expect(result.summary.total).toBe(4);
      expect(result.summary.withEmail).toBe(2);
      expect(result.summary.withPhone).toBe(2);
    });
  });
});
