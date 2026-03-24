import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Contraseña actual del usuario',
  })
  @IsString()
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({
    example: 'NewPassword456!',
    minLength: 8,
    maxLength: 128,
    description:
      'Nueva contraseña. Debe contener mayúscula, minúscula y número',
  })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  newPassword!: string;
}
