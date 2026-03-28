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

  @ApiPropertyOptional({
    description:
      'Plantilla de imagen del vehículo para mapa de daños (base64 o URL). Opciones: sedan, camioneta, suv, moto, bus, o una imagen custom.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  damageMapTemplate?: string;

  @ApiPropertyOptional({
    description: 'Imagen custom para el mapa de daños (base64 data URI)',
    maxLength: 500000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500000)
  damageMapCustomImage?: string;
}
