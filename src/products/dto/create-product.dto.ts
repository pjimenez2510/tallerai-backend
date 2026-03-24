import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'REP-001', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({
    example: '90915-YZZD1',
    maxLength: 100,
    description: 'Código OEM del fabricante',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  oemCode?: string;

  @ApiProperty({ example: 'Filtro de aceite Toyota Hilux', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    example: 'Filtro de aceite original',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Toyota', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'Filtros', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'unidad', maxLength: 30, default: 'unidad' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unit?: string;

  @ApiProperty({ example: 8.5, description: 'Precio de costo' })
  @IsNumber({}, { message: 'El precio de costo debe ser un número' })
  @Min(0)
  costPrice!: number;

  @ApiProperty({ example: 15.0, description: 'Precio de venta' })
  @IsNumber({}, { message: 'El precio de venta debe ser un número' })
  @Min(0)
  salePrice!: number;

  @ApiPropertyOptional({ example: 50, description: 'Stock inicial' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 5, description: 'Stock mínimo para alerta' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: 'Estante A-3', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'Repuestos Ecuador S.A.', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;
}
