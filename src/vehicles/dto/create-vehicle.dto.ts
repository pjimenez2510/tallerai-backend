import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateVehicleDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del cliente propietario',
  })
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido' })
  clientId!: string;

  @ApiProperty({ example: 'GYE-1234', maxLength: 10 })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  plate!: string;

  @ApiProperty({ example: 'Toyota', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  brand!: string;

  @ApiProperty({ example: 'Hilux', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model!: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({ example: 'Blanco', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    example: '1HGBH41JXMN109186',
    maxLength: 17,
    description: 'Vehicle Identification Number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(17)
  vin?: string;

  @ApiPropertyOptional({ example: '2.4L Diesel', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  engine?: string;

  @ApiPropertyOptional({ example: 'Automática', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transmission?: string;

  @ApiPropertyOptional({ example: 'Diesel', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fuelType?: string;

  @ApiPropertyOptional({ example: 45000, description: 'Kilometraje actual' })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ example: 'Vehículo de trabajo', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
