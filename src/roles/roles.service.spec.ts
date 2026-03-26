import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { RolesService } from './roles.service';

const TENANT_ID = 'tenant-001';

const mockPrisma = {
  role: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function makeRole(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'role-001',
    tenant_id: TENANT_ID,
    name: 'Recepcionista',
    slug: 'recepcionista',
    description: 'Can manage clients',
    permissions: ['clients.view', 'clients.create'],
    is_system: false,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    _count: { users: 0 },
    ...overrides,
  };
}

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RolesService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('findAll', () => {
    it('should return all roles for the tenant', async () => {
      mockPrisma.role.findMany.mockResolvedValue([makeRole()]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('role-001');
      expect(result[0].slug).toBe('recepcionista');
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID },
        include: { _count: { select: { users: true } } },
        orderBy: { created_at: 'asc' },
      });
    });

    it('should return empty array when no roles', async () => {
      mockPrisma.role.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(makeRole());

      const result = await service.findOne('role-001');

      expect(result.id).toBe('role-001');
      expect(result.userCount).toBe(0);
    });

    it('should throw NotFoundException when role not found', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = {
      name: 'Recepcionista',
      slug: 'recepcionista',
      description: 'Can manage clients',
      permissions: ['clients.view', 'clients.create'],
    };

    it('should create a role successfully', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue(makeRole());

      const result = await service.create(dto);

      expect(result.id).toBe('role-001');
      expect(result.slug).toBe('recepcionista');
      expect(result.isSystem).toBe(false);
      expect(result.userCount).toBe(0);
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(makeRole());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should log role creation', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue(makeRole());

      await service.create(dto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { roleId: 'role-001', tenantId: TENANT_ID },
        'Role created',
      );
    });
  });

  describe('update', () => {
    it('should update a role successfully', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(makeRole());
      mockPrisma.role.update.mockResolvedValue(
        makeRole({ name: 'Recepcionista Senior' }),
      );

      const result = await service.update('role-001', {
        name: 'Recepcionista Senior',
      });

      expect(result.name).toBe('Recepcionista Senior');
    });

    it('should throw NotFoundException when role not found', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a non-system role with no users', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(
        makeRole({ is_system: false, _count: { users: 0 } }),
      );
      mockPrisma.role.delete.mockResolvedValue({});

      await expect(service.delete('role-001')).resolves.not.toThrow();
      expect(mockPrisma.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-001' },
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to delete a system role', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(
        makeRole({ is_system: true }),
      );

      await expect(service.delete('role-001')).rejects.toThrow(
        new BadRequestException('Cannot delete system roles'),
      );
    });

    it('should throw BadRequestException when role has users assigned', async () => {
      mockPrisma.role.findFirst.mockResolvedValue(
        makeRole({ is_system: false, _count: { users: 3 } }),
      );

      await expect(service.delete('role-001')).rejects.toThrow(
        new BadRequestException(
          'Cannot delete a role that has users assigned to it',
        ),
      );
    });
  });

  describe('getAvailablePermissions', () => {
    it('should return permissions grouped by module', () => {
      const result = service.getAvailablePermissions();

      expect(result).toHaveProperty('dashboard');
      expect(result).toHaveProperty('clients');
      expect(result).toHaveProperty('vehicles');
      expect(result['clients']).toContain('clients.view');
      expect(result['clients']).toContain('clients.create');
    });

    it('should include all modules', () => {
      const result = service.getAvailablePermissions();
      const modules = Object.keys(result);

      expect(modules).toContain('work_orders');
      expect(modules).toContain('inventory');
      expect(modules).toContain('roles');
      expect(modules).toContain('settings');
      expect(modules).toContain('reports');
      expect(modules).toContain('mechanic');
      expect(modules).toContain('notifications');
    });
  });
});
