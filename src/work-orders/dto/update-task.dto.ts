import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Cambio de pastillas y discos',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Marcar tarea como completada',
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ example: 2.0, description: 'Horas de mano de obra' })
  @IsOptional()
  @IsNumber({}, { message: 'laborHours debe ser un número' })
  @Min(0)
  laborHours?: number;

  @ApiPropertyOptional({ example: 60.0, description: 'Costo de mano de obra' })
  @IsOptional()
  @IsNumber({}, { message: 'laborCost debe ser un número' })
  @Min(0)
  laborCost?: number;
}
