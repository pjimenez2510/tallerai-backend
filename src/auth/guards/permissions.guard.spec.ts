import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

const makeUser = (permissions: string[]): AuthenticatedUser => ({
  id: 'u1',
  tenantId: 't1',
  role: 'admin',
  email: 'a@b.com',
  roleId: null,
  roleSlug: null,
  permissions,
});

const makeContext = (
  user: AuthenticatedUser | undefined,
  handler = jest.fn(),
  classRef = jest.fn(),
): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('should allow access when no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext(makeUser([]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when permissions array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const ctx = makeContext(makeUser([]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['clients.view', 'clients.create']);
    const ctx = makeContext(
      makeUser(['clients.view', 'clients.create', 'dashboard.view']),
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user is missing one required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['clients.view', 'clients.delete']);
    const ctx = makeContext(makeUser(['clients.view']));
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny access when user has no permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['clients.view']);
    const ctx = makeContext(makeUser([]));
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny access when no user is present', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['clients.view']);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should allow access with single matching permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['settings.view']);
    const ctx = makeContext(makeUser(['settings.view', 'settings.edit']));
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
