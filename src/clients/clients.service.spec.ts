import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { ClientsService } from './clients.service';

const mockPrisma = {
  client: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
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

function makeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'client-001',
    tenant_id: TENANT_ID,
    document_type: DocumentType.cedula,
    document_number: '0912345678',
    name: 'Carlos Mendoza',
    email: 'carlos@email.com',
    phone: '0998765432',
    phone_secondary: null,
    address: 'Av. Principal 123',
    notes: null,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientsService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto = {
      documentType: DocumentType.cedula,
      documentNumber: '0912345678',
      name: 'Carlos Mendoza',
      email: 'carlos@email.com',
      phone: '0998765432',
    };

    it('should create a client successfully', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      mockPrisma.client.create.mockResolvedValue(makeClient());

      const result = await service.create(dto);

      expect(result.id).toBe('client-001');
      expect(result.name).toBe('Carlos Mendoza');
      expect(result.documentNumber).toBe('0912345678');
      expect(mockPrisma.client.create).toHaveBeenCalledWith({
        data: {
          tenant_id: TENANT_ID,
          document_type: DocumentType.cedula,
          document_number: '0912345678',
          name: 'Carlos Mendoza',
          email: 'carlos@email.com',
          phone: '0998765432',
          phone_secondary: undefined,
          address: undefined,
          notes: undefined,
        },
      });
    });

    it('should throw ConflictException if document exists in tenant', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(makeClient());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should log client creation', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      mockPrisma.client.create.mockResolvedValue(makeClient());

      await service.create(dto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { clientId: 'client-001', tenantId: TENANT_ID },
        'Client created',
      );
    });
  });

  describe('findAll', () => {
    it('should return all active clients for the tenant', async () => {
      mockPrisma.client.findMany.mockResolvedValue([
        makeClient(),
        makeClient({ id: 'client-002', name: 'Pedro' }),
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID, is_active: true },
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return empty array if no clients', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a client by id', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(makeClient());

      const result = await service.findOne('client-001');

      expect(result.id).toBe('client-001');
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'client-001', tenant_id: TENANT_ID },
      });
    });

    it('should throw NotFoundException if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a client successfully', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(makeClient());
      mockPrisma.client.update.mockResolvedValue(
        makeClient({ name: 'Carlos Actualizado' }),
      );

      const result = await service.update('client-001', {
        name: 'Carlos Actualizado',
      });

      expect(result.name).toBe('Carlos Actualizado');
    });

    it('should throw NotFoundException if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check document uniqueness when changing document number', async () => {
      mockPrisma.client.findFirst
        .mockResolvedValueOnce(makeClient())
        .mockResolvedValueOnce(makeClient({ id: 'other-client' }));

      await expect(
        service.update('client-001', { documentNumber: '0999999999' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check document if unchanged', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(makeClient());
      mockPrisma.client.update.mockResolvedValue(
        makeClient({ name: 'Updated' }),
      );

      await service.update('client-001', {
        name: 'Updated',
        documentNumber: '0912345678',
      });

      expect(mockPrisma.client.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a client', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(makeClient());
      mockPrisma.client.update.mockResolvedValue(
        makeClient({ is_active: false }),
      );

      const result = await service.deactivate('client-001');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-001' },
        data: { is_active: false },
      });
    });

    it('should throw NotFoundException if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a client', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(
        makeClient({ is_active: false }),
      );
      mockPrisma.client.update.mockResolvedValue(makeClient());

      const result = await service.activate('client-001');

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if client not found', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.activate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should search clients by query', async () => {
      mockPrisma.client.findMany.mockResolvedValue([makeClient()]);

      const result = await service.search('Carlos');

      expect(result).toHaveLength(1);
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: TENANT_ID,
          is_active: true,
          OR: [
            { name: { contains: 'Carlos', mode: 'insensitive' } },
            { document_number: { contains: 'Carlos', mode: 'insensitive' } },
            { phone: { contains: 'Carlos', mode: 'insensitive' } },
            { email: { contains: 'Carlos', mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
        take: 20,
      });
    });

    it('should return empty array for no matches', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);

      const result = await service.search('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
