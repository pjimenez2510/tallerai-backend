import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

const makeMockConfig = () => ({
  get: jest.fn().mockReturnValue('test-jwt-secret'),
});

const makeMockPrisma = () => ({
  user: {
    findFirst: jest.fn(),
  },
});

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    const mockConfig = makeMockConfig();
    mockPrisma = makeMockPrisma();

    strategy = new JwtStrategy(
      mockConfig as unknown as ConfigService,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('should return authenticated user when user exists and is active', async () => {
    const mockRole = {
      id: 'role-uuid',
      slug: 'admin',
      permissions: ['dashboard.view'],
    };
    const mockUser = {
      id: 'user-uuid',
      tenant_id: 'tenant-uuid',
      email: 'admin@test.com',
      is_active: true,
      role_id: 'role-uuid',
      role: mockRole,
    };
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: 'user-uuid',
      tenantId: 'tenant-uuid',
      roleSlug: 'admin',
      email: 'admin@test.com',
    });

    expect(result).toEqual({
      id: 'user-uuid',
      tenantId: 'tenant-uuid',
      roleSlug: 'admin',
      email: 'admin@test.com',
      roleId: 'role-uuid',
      permissions: ['dashboard.view'],
    });
  });

  it('should return roleSlug and permissions from the role relation', async () => {
    const mockUser = {
      id: 'user-uuid',
      tenant_id: 'tenant-uuid',
      email: 'admin@test.com',
      is_active: true,
      role_id: 'role-uuid',
      role: {
        id: 'role-uuid',
        slug: 'mecanico',
        permissions: ['work_orders.view'],
      },
    };
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: 'user-uuid',
      tenantId: 'tenant-uuid',
      roleSlug: 'mecanico',
      email: 'admin@test.com',
    });

    expect(result.roleId).toBe('role-uuid');
    expect(result.roleSlug).toBe('mecanico');
    expect(result.permissions).toEqual(['work_orders.view']);
  });

  it('should query with user id, tenant id, is_active and include role', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-uuid',
      tenant_id: 'tenant-uuid',
      email: 'admin@test.com',
      role_id: 'role-uuid',
      role: { slug: 'admin', permissions: [] },
    });

    await strategy.validate({
      sub: 'user-uuid',
      tenantId: 'tenant-uuid',
      roleSlug: 'admin',
      email: 'admin@test.com',
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-uuid',
        tenant_id: 'tenant-uuid',
        is_active: true,
      },
      include: {
        role: true,
      },
    });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'user-uuid',
        tenantId: 'tenant-uuid',
        roleSlug: 'admin',
        email: 'admin@test.com',
      }),
    ).rejects.toThrow(
      new UnauthorizedException('Usuario no encontrado o inactivo'),
    );
  });

  it('should throw Error when JWT_SECRET is not configured', () => {
    const noSecretConfig = { get: jest.fn().mockReturnValue(undefined) };

    expect(
      () =>
        new JwtStrategy(
          noSecretConfig as unknown as ConfigService,
          mockPrisma as unknown as PrismaService,
        ),
    ).toThrow('JWT_SECRET is not configured');
  });
});
