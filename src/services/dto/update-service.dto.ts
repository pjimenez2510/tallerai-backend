import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'SRV-002', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    example: 'Cambio de aceite sintético y filtro',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 'Incluye aceite sintético 5W30 y filtro original',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 40.0 })
  @IsOptional()
  @IsNumber({}, { message: 'price debe ser un número' })
  @Min(0)
  price?: number;
}
