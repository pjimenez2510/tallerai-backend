import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty({
    enum: StockMovementType,
    example: 'ingreso',
    description: 'Tipo de movimiento: ingreso, salida, ajuste',
  })
  @IsEnum(StockMovementType, {
    message: 'type debe ser: ingreso, salida o ajuste',
  })
  type!: StockMovementType;

  @ApiProperty({ example: 10, description: 'Cantidad de unidades' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: 8.5,
    description: 'Costo unitario (opcional para ingresos)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'unitCost debe ser un número' })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    example: 'FACT-2026-001',
    maxLength: 200,
    description: 'Referencia del documento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional({
    example: 'Compra a proveedor Repuestos Ecuador',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
