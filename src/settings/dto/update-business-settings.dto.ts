import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({
    description: 'Moneda (ISO 4217, e.g. USD)',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Tasa de impuesto (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Términos de pago por defecto',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  defaultPaymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Horario de trabajo (e.g. Lun-Vie 8:00-18:00)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workingHours?: string;
}
