import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPermissionList } from '../validators/is-permission-list.validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Recepcionista Senior', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Can manage clients, vehicles and view reports',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: ['clients.view', 'clients.create', 'reports.view'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsPermissionList()
  permissions?: string[];
}
