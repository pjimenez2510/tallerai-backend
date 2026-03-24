import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    enum: DocumentType,
    example: 'cedula',
    description: 'Tipo de documento: cedula, ruc, pasaporte',
  })
  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser uno de: cedula, ruc, pasaporte',
  })
  documentType!: DocumentType;

  @ApiProperty({
    example: '0912345678',
    maxLength: 20,
    description: 'Número de cédula, RUC o pasaporte',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  documentNumber!: string;

  @ApiProperty({ example: 'Carlos Mendoza', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'carlos@email.com', maxLength: 200 })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: '0998765432', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '0987654321', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneSecondary?: string;

  @ApiPropertyOptional({
    example: 'Av. Principal 123, Guayaquil',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Cliente frecuente', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
