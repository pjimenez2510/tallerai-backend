import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Carlos Carrillo', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '0998765432', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatar.jpg',
    maxLength: 500,
    description: 'URL of the user avatar image',
  })
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl debe ser una URL válida' })
  @MaxLength(500)
  avatarUrl?: string;
}
