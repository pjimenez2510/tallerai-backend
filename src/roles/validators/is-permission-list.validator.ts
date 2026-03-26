import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../auth/permissions/permissions.enum';

const validSet = new Set<string>(ALL_PERMISSIONS);

@ValidatorConstraint({ name: 'isPermissionList', async: false })
export class IsPermissionListConstraint implements ValidatorConstraintInterface {
  validate(permissions: unknown): boolean {
    if (!Array.isArray(permissions)) return false;
    return permissions.every((p) => typeof p === 'string' && validSet.has(p));
  }

  defaultMessage(): string {
    return `Each permission must be a valid permission key. Valid values: ${ALL_PERMISSIONS.join(', ')}`;
  }
}

export function IsPermissionList(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPermissionListConstraint,
    });
  };
}
