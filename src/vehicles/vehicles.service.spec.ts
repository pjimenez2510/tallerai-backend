import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { VehiclesService } from './vehicles.service';

const mockPrisma = {
  vehicle: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  client: {
    findFirst: jest.fn(),
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

function makeVehicle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'vehicle-001',
    tenant_id: TENANT_ID,
    client_id: 'client-001',
    client: { name: 'Carlos Mendoza' },
    plate: 'GYE-1234',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2024,
    color: 'Blanco',
    vin: null,
    engine: '2.4L Diesel',
    transmission: 'Manual',
    fuel_type: 'Diesel',
    mileage: 45000,
    notes: null,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('VehiclesService', () => {
  let service: VehiclesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VehiclesService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto = {
      clientId: 'client-001',
      plate: 'GYE-1234',
      brand: 'Toyota',
      model: 'Hilux',
      year: 2024,
      color: 'Blanco',
      engine: '2.4L Diesel',
      transmission: 'Manual',
      fuelType: 'Diesel',
      mileage: 45000,
    };

    it('should create a vehicle successfully', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-001' });
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockResolvedValue(makeVehicle());

      const result = await service.create(dto);

      expect(result.id).toBe('vehicle-001');
      expect(result.plate).toBe('GYE-1234');
      expect(result.clientName).toBe('Carlos Mendoza');
    });

    it('should throw NotFoundException if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if plate exists in tenant', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-001' });
      mockPrisma.vehicle.findFirst.mockResolvedValue(makeVehicle());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should uppercase the plate', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'client-001' });
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      mockPrisma.vehicle.create.mockResolvedValue(makeVehicle());

      await service.create({ ...dto, plate: 'gye-1234' });

      expect(mockPrisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plate: 'GYE-1234' }) as unknown,
        }),
      );
    });
  });

  describe('findAll', () => {
    const pagination = { page: 1, limit: 20, skip: 0 };

    it('should return paginated active vehicles', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([makeVehicle()]);
      mockPrisma.vehicle.count.mockResolvedValue(1);

      const result = await service.findAll(pagination);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('findByClient', () => {
    it('should return vehicles for a specific client', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([makeVehicle()]);

      const result = await service.findByClient('client-001');

      expect(result).toHaveLength(1);
      expect(mockPrisma.vehicle.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          client_id: 'client-001',
          is_active: true,
        },
        include: { client: true },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a vehicle by id', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(makeVehicle());

      const result = await service.findOne('vehicle-001');

      expect(result.id).toBe('vehicle-001');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByPlate', () => {
    it('should return a vehicle by plate', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(makeVehicle());

      const result = await service.findByPlate('gye-1234');

      expect(result.plate).toBe('GYE-1234');
      expect(mockPrisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID, plate: 'GYE-1234' },
        include: { client: true },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findByPlate('NONE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a vehicle', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(makeVehicle());
      mockPrisma.vehicle.update.mockResolvedValue(
        makeVehicle({ mileage: 50000 }),
      );

      const result = await service.update('vehicle-001', { mileage: 50000 });

      expect(result.mileage).toBe(50000);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { mileage: 50000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check plate uniqueness when changing plate', async () => {
      mockPrisma.vehicle.findFirst
        .mockResolvedValueOnce(makeVehicle())
        .mockResolvedValueOnce(makeVehicle({ id: 'other' }));

      await expect(
        service.update('vehicle-001', { plate: 'NEW-9999' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate client when changing clientId', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(makeVehicle());
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update('vehicle-001', { clientId: 'bad-client' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a vehicle', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(makeVehicle());
      mockPrisma.vehicle.update.mockResolvedValue(
        makeVehicle({ is_active: false }),
      );

      const result = await service.deactivate('vehicle-001');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should search vehicles by query', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([makeVehicle()]);

      const result = await service.search('Toyota');

      expect(result).toHaveLength(1);
    });

    it('should return empty for no matches', async () => {
      mockPrisma.vehicle.findMany.mockResolvedValue([]);

      const result = await service.search('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
