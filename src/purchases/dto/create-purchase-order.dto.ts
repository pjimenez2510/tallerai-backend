import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID('4', { message: 'El ID del producto debe ser un UUID válido' })
  productId!: string;

  @ApiProperty({ example: 10, description: 'Cantidad a comprar' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 8.5, description: 'Costo unitario' })
  @IsNumber({}, { message: 'El costo unitario debe ser un número' })
  @Min(0)
  unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'Repuestos Ecuador S.A.', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  supplier!: string;

  @ApiPropertyOptional({
    example: 'Pedido mensual de filtros',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}
