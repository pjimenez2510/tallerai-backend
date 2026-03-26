import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez', maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'juan@tallercarrillo.com', maxLength: 200 })
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(200)
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    maxLength: 128,
    description: 'Debe contener mayúscula, minúscula y número',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password!: string;

  @ApiProperty({
    example: 'uuid-of-role',
    description: 'ID of the role to assign to the user',
  })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ example: '0998765432', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
