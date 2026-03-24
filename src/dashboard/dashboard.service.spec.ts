import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { DashboardService } from './dashboard.service';

const TENANT_ID = 'tenant-001';

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

const mockPrisma = {
  workOrder: {
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  client: {
    count: jest.fn(),
  },
  vehicle: {
    count: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
    );
  });

  describe('getMetrics', () => {
    it('should return full metrics for tenant', async () => {
      mockPrisma.workOrder.groupBy.mockResolvedValue([
        {
          status: WorkOrderStatus.recepcion,
          _count: { status: 3 },
        },
        {
          status: WorkOrderStatus.en_progreso,
          _count: { status: 2 },
        },
        {
          status: WorkOrderStatus.completado,
          _count: { status: 5 },
        },
      ]);

      mockPrisma.client.count
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(5);

      mockPrisma.vehicle.count.mockResolvedValue(38);

      mockPrisma.product.findMany.mockResolvedValue([
        { stock: 10, sale_price: { valueOf: () => 25.0 }, min_stock: 5 },
        { stock: 2, sale_price: { valueOf: () => 100.0 }, min_stock: 5 },
        { stock: 0, sale_price: { valueOf: () => 50.0 }, min_stock: 1 },
      ]);

      mockPrisma.workOrder.aggregate.mockResolvedValue({
        _sum: {
          total_parts: { valueOf: () => 1500.0 },
          total_labor: { valueOf: () => 800.0 },
          total: { valueOf: () => 2300.0 },
        },
      });

      const result = await service.getMetrics();

      expect(result.workOrders.total).toBe(10);
      expect(result.workOrders.byStatus.recepcion).toBe(3);
      expect(result.workOrders.byStatus.en_progreso).toBe(2);
      expect(result.workOrders.byStatus.completado).toBe(5);
      expect(result.workOrders.byStatus.diagnostico).toBe(0);

      expect(result.clients.total).toBe(42);
      expect(result.clients.newThisMonth).toBe(5);

      expect(result.vehicles.total).toBe(38);

      expect(result.inventory.totalProducts).toBe(3);
      expect(result.inventory.lowStockCount).toBe(2);

      expect(mockPrisma.workOrder.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: TENANT_ID },
        }),
      );
    });

    it('should scope all queries to tenant', async () => {
      mockPrisma.workOrder.groupBy.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.aggregate.mockResolvedValue({
        _sum: { total_parts: null, total_labor: null, total: null },
      });

      await service.getMetrics();

      expect(mockPrisma.workOrder.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenant_id: TENANT_ID } }),
      );
      expect(mockPrisma.client.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenant_id: TENANT_ID }) as unknown,
        }),
      );
      expect(mockPrisma.vehicle.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: TENANT_ID, is_active: true },
        }),
      );
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: TENANT_ID, is_active: true },
        }),
      );
    });

    it('should handle null revenue sums gracefully', async () => {
      mockPrisma.workOrder.groupBy.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.aggregate.mockResolvedValue({
        _sum: { total_parts: null, total_labor: null, total: null },
      });

      const result = await service.getMetrics();

      expect(result.revenue.totalParts).toBe(0);
      expect(result.revenue.totalLabor).toBe(0);
      expect(result.revenue.total).toBe(0);
    });

    it('should return zero for all statuses when no work orders exist', async () => {
      mockPrisma.workOrder.groupBy.mockResolvedValue([]);
      mockPrisma.client.count.mockResolvedValue(0);
      mockPrisma.vehicle.count.mockResolvedValue(0);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.aggregate.mockResolvedValue({
        _sum: { total_parts: null, total_labor: null, total: null },
      });

      const result = await service.getMetrics();

      expect(result.workOrders.total).toBe(0);
      expect(result.workOrders.byStatus.recepcion).toBe(0);
      expect(result.workOrders.byStatus.entregado).toBe(0);
      expect(result.workOrders.byStatus.cancelado).toBe(0);
    });
  });
});
