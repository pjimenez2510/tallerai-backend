import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido' })
  clientId?: string;

  @ApiPropertyOptional({ example: 'GYE-5678', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  plate?: string;

  @ApiPropertyOptional({ example: 'Chevrolet', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'D-Max', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 'Negro', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ example: '1HGBH41JXMN109186', maxLength: 17 })
  @IsOptional()
  @IsString()
  @MaxLength(17)
  vin?: string;

  @ApiPropertyOptional({ example: '3.0L V6', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  engine?: string;

  @ApiPropertyOptional({ example: 'Manual', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transmission?: string;

  @ApiPropertyOptional({ example: 'Gasolina', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fuelType?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ example: 'Notas actualizadas', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
