import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateClientDto {
  @ApiPropertyOptional({
    enum: DocumentType,
    example: 'cedula',
  })
  @IsOptional()
  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser uno de: cedula, ruc, pasaporte',
  })
  documentType?: DocumentType;

  @ApiPropertyOptional({ example: '0912345678', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  documentNumber?: string;

  @ApiPropertyOptional({
    example: 'Carlos Mendoza Actualizado',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'carlos.nuevo@email.com', maxLength: 200 })
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
    example: 'Av. Principal 456, Guayaquil',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Notas actualizadas', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
