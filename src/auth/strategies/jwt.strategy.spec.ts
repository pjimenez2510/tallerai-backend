import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
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
      role: UserRole.admin,
      email: 'admin@test.com',
      is_active: true,
      role_id: 'role-uuid',
      role_ref: mockRole,
    };
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: 'user-uuid',
      tenantId: 'tenant-uuid',
      role: UserRole.admin,
      email: 'admin@test.com',
    });

    expect(result).toEqual({
      id: 'user-uuid',
      tenantId: 'tenant-uuid',
      role: UserRole.admin,
      email: 'admin@test.com',
      roleId: 'role-uuid',
      roleSlug: 'admin',
      permissions: ['dashboard.view'],
    });
  });

  it('should return null roleSlug and empty permissions when no role_ref', async () => {
    const mockUser = {
      id: 'user-uuid',
      tenant_id: 'tenant-uuid',
      role: UserRole.admin,
      email: 'admin@test.com',
      is_active: true,
      role_id: null,
      role_ref: null,
    };
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: 'user-uuid',
      tenantId: 'tenant-uuid',
      role: UserRole.admin,
      email: 'admin@test.com',
    });

    expect(result.roleId).toBeNull();
    expect(result.roleSlug).toBeNull();
    expect(result.permissions).toEqual([]);
  });

  it('should query with user id, tenant id, is_active and include role_ref', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-uuid',
      tenant_id: 'tenant-uuid',
      role: UserRole.admin,
      email: 'admin@test.com',
      role_id: null,
      role_ref: null,
    });

    await strategy.validate({
      sub: 'user-uuid',
      tenantId: 'tenant-uuid',
      role: UserRole.admin,
      email: 'admin@test.com',
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-uuid',
        tenant_id: 'tenant-uuid',
        is_active: true,
      },
      include: {
        role_ref: true,
      },
    });
  });

  it('should throw UnauthorizedException when user not found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'user-uuid',
        tenantId: 'tenant-uuid',
        role: UserRole.admin,
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
