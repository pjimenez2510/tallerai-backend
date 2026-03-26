import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALL_PERMISSIONS } from '../../auth/permissions/permissions.enum';
import { IsPermissionList } from '../validators/is-permission-list.validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Recepcionista', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'recepcionista',
    maxLength: 50,
    description: 'Lowercase letters, numbers, and underscores only',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Slug must contain only lowercase letters, numbers, and underscores',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Can manage clients and vehicles',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: ['clients.view', 'clients.create'],
    description: `List of permissions. Valid values: ${ALL_PERMISSIONS.join(', ')}`,
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsPermissionList()
  permissions!: string[];
}
