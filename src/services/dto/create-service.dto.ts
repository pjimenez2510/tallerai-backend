import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'SRV-001', maxLength: 50, description: 'Código único del servicio (se convierte a mayúsculas)' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Cambio de aceite y filtro', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Incluye aceite sintético 5W30 y filtro original', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 35.0, description: 'Precio del servicio' })
  @IsNumber({}, { message: 'price debe ser un número' })
  @Min(0)
  price!: number;
}
