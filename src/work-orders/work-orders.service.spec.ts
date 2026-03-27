import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { WorkOrdersService } from './work-orders.service';

const mockPrisma = {
  workOrder: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  client: { findFirst: jest.fn() },
  vehicle: { findFirst: jest.fn() },
  user: { findFirst: jest.fn() },
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const TENANT_ID = 'tenant-001';
const mockTenantContext = { getTenantId: jest.fn().mockReturnValue(TENANT_ID) };

function makeWorkOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wo-001',
    tenant_id: TENANT_ID,
    order_number: 'OT-2026-0001',
    client_id: 'client-001',
    client: { name: 'Carlos Mendoza' },
    vehicle_id: 'vehicle-001',
    vehicle: { plate: 'GYE-1234', brand: 'Toyota', model: 'Hilux', year: 2024 },
    assigned_to: null,
    parent_id: null,
    mechanic: null,
    status: WorkOrderStatus.recepcion,
    priority: WorkOrderPriority.normal,
    description: 'Cambio de aceite',
    diagnosis: null,
    internal_notes: null,
    mileage_in: 45000,
    estimated_date: null,
    completed_date: null,
    delivered_date: null,
    total_parts: { toNumber: () => 0 },
    total_labor: { toNumber: () => 0 },
    total: { toNumber: () => 0 },
    client_signature: null,
    signature_date: null,
    tasks: [],
    parts: [],
    supplements: [],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkOrdersService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto = {
      clientId: 'client-001',
      vehicleId: 'vehicle-001',
      description: 'Cambio de aceite',
      mileageIn: 45000,
    };

    it('should create a work order with auto-generated number', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-001' });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-001' });
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);
      mockPrisma.workOrder.create.mockResolvedValue(makeWorkOrder());

      const result = await service.create(dto);

      expect(result.id).toBe('wo-001');
      expect(result.orderNumber).toBe('OT-2026-0001');
      expect(result.status).toBe('recepcion');
    });

    it('should throw if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if vehicle not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-001' });
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const pagination = { page: 1, limit: 20, skip: 0 };

    it('should return paginated work orders for tenant', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([makeWorkOrder()]);
      mockPrisma.workOrder.count.mockResolvedValue(1);

      const result = await service.findAll(pagination);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.count.mockResolvedValue(0);

      await service.findAll(pagination, WorkOrderStatus.diagnostico);

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: TENANT_ID, status: WorkOrderStatus.diagnostico },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a work order by id', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeWorkOrder());

      const result = await service.findOne('wo-001');

      expect(result.id).toBe('wo-001');
    });

    it('should throw if not found', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update description', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(makeWorkOrder());
      mockPrisma.workOrder.update.mockResolvedValue(
        makeWorkOrder({ description: 'Updated' }),
      );

      const result = await service.update('wo-001', {
        description: 'Updated',
      });

      expect(result.description).toBe('Updated');
    });

    it('should validate status transitions', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(
        makeWorkOrder({ status: WorkOrderStatus.recepcion }),
      );

      await expect(
        service.update('wo-001', { status: WorkOrderStatus.completado }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid transition recepcion → diagnostico', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(
        makeWorkOrder({ status: WorkOrderStatus.recepcion }),
      );
      mockPrisma.workOrder.update.mockResolvedValue(
        makeWorkOrder({ status: WorkOrderStatus.diagnostico }),
      );

      const result = await service.update('wo-001', {
        status: WorkOrderStatus.diagnostico,
      });

      expect(result.status).toBe('diagnostico');
    });

    it('should set completed_date when completing', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(
        makeWorkOrder({ status: WorkOrderStatus.en_progreso }),
      );
      mockPrisma.workOrder.update.mockResolvedValue(
        makeWorkOrder({ status: WorkOrderStatus.completado }),
      );

      await service.update('wo-001', {
        status: WorkOrderStatus.completado,
      });

      expect(mockPrisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: WorkOrderStatus.completado,
            completed_date: expect.any(Date) as unknown,
          }) as unknown,
        }),
      );
    });

    it('should throw if work order not found', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { description: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
