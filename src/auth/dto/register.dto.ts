import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Taller Carrillo & Hijos', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  tenantName!: string;

  @ApiProperty({ example: '0992345678001', description: 'RUC ecuatoriano (13 dígitos)' })
  @IsString()
  @Matches(/^\d{13}$/, { message: 'El RUC debe tener exactamente 13 dígitos numéricos' })
  @MaxLength(13)
  tenantRuc!: string;

  @ApiProperty({ example: 'Carlos Carrillo', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  adminName!: string;

  @ApiProperty({ example: 'carlos@tallercarrillo.com', maxLength: 200 })
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(200)
  adminEmail!: string;

  @ApiProperty({
    example: 'MiPassword123!',
    minLength: 8,
    maxLength: 128,
    description: 'Debe contener mayúscula, minúscula y número',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  adminPassword!: string;

  @ApiPropertyOptional({ example: '0998765432', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  adminPhone?: string;
}
