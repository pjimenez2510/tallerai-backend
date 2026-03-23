import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

const makeContext = (
  role: string | undefined,
  handler = jest.fn(),
  classRef = jest.fn(),
): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => ({
        user: role
          ? { id: 'u1', tenantId: 't1', role, email: 'a@b.com' }
          : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext(UserRole.mecanico);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const ctx = makeContext(UserRole.mecanico);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has a required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.admin, UserRole.jefe_taller]);
    const ctx = makeContext(UserRole.admin);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user does not have a required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.admin]);
    const ctx = makeContext(UserRole.mecanico);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny access when no user is present', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.admin]);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should allow jefe_taller when jefe_taller is in required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.admin, UserRole.jefe_taller]);
    const ctx = makeContext(UserRole.jefe_taller);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny recepcionista when only admin is required', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.admin]);
    const ctx = makeContext(UserRole.recepcionista);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
