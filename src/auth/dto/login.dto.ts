import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'carlos@tallercarrillo.com', maxLength: 200 })
  @IsEmail({}, { message: 'El email debe ser válido' })
  @MaxLength(200)
  email!: string;

  @ApiProperty({ example: 'MiPassword123!', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  password!: string;
}
