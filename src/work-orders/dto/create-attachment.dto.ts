import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, Matches, IsOptional } from 'class-validator';

const ALLOWED_MIME_TYPES =
  /^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf)$/;

export class CreateAttachmentDto {
  @ApiProperty({ example: 'foto-motor.jpg', description: 'Nombre del archivo' })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({
    example: 'image/jpeg',
    description:
      'Tipo MIME del archivo (image/jpeg, image/png, application/pdf, etc.)',
  })
  @IsString()
  @MaxLength(100)
  @Matches(ALLOWED_MIME_TYPES, {
    message: 'Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y PDF',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Contenido del archivo en base64',
    example: '/9j/4AAQSkZJRgAB...',
  })
  @IsString()
  @MaxLength(7_000_000, {
    message: 'El archivo es demasiado grande (máximo 5MB)',
  })
  data!: string;

  @ApiPropertyOptional({ example: 'Foto del motor antes de la reparación' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
