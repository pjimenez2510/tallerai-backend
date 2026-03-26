import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../permissions/permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    return requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
  }
}
