import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { UsersService } from './users.service';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
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

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-001',
    tenant_id: TENANT_ID,
    name: 'Juan Pérez',
    email: 'juan@test.com',
    password_hash: 'hashed',
    role: UserRole.mecanico,
    phone: '0998765432',
    avatar_url: null,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
    service = new UsersService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto = {
      name: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'Password123!',
      role: UserRole.mecanico,
      phone: '0998765432',
    };

    it('should create a user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      const result = await service.create(dto);

      expect(result.id).toBe('user-001');
      expect(result.name).toBe('Juan Pérez');
      expect(result.email).toBe('juan@test.com');
      expect(result.role).toBe(UserRole.mecanico);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          tenant_id: TENANT_ID,
          name: dto.name,
          email: dto.email,
          password_hash: 'hashed-pw',
          role: dto.role,
          role_id: null,
          phone: dto.phone,
        },
      });
    });

    it('should throw ConflictException if email exists in tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash the password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    });

    it('should log user creation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      await service.create(dto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: 'user-001', tenantId: TENANT_ID, role: UserRole.mecanico },
        'User created',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users for the tenant', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        makeUser(),
        makeUser({ id: 'user-002', name: 'Pedro' }),
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID },
        orderBy: { created_at: 'desc' },
      });
    });

    it('should return empty array if no users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());

      const result = await service.findOne('user-001');

      expect(result.id).toBe('user-001');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-001', tenant_id: TENANT_ID },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto = { name: 'Juan Actualizado' };

    it('should update a user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(
        makeUser({ name: 'Juan Actualizado' }),
      );

      const result = await service.update('user-001', dto);

      expect(result.name).toBe('Juan Actualizado');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { name: 'Juan Actualizado' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.update('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should check email uniqueness when changing email', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(makeUser()) // existing user
        .mockResolvedValueOnce(makeUser({ id: 'other-user' })); // email taken

      await expect(
        service.update('user-001', { email: 'taken@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check email if unchanged', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser({ name: 'Updated' }));

      await service.update('user-001', {
        name: 'Updated',
        email: 'juan@test.com',
      });

      // findFirst called only once (for existing user check)
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should hash password when updating password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser());

      await service.update('user-001', { password: 'NewPass123!' });

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { password_hash: 'hashed-pw' },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser({ is_active: false }));

      const result = await service.deactivate('user-001');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { is_active: false },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({ is_active: false }),
      );
      mockPrisma.user.update.mockResolvedValue(makeUser({ is_active: true }));

      const result = await service.activate('user-001');

      expect(result.isActive).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { is_active: true },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.activate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
