import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Cambio de pastillas de freno', maxLength: 1000 })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ example: 1.5, description: 'Horas de mano de obra' })
  @IsOptional()
  @IsNumber({}, { message: 'laborHours debe ser un número' })
  @Min(0)
  laborHours?: number;

  @ApiPropertyOptional({ example: 45.0, description: 'Costo de mano de obra' })
  @IsOptional()
  @IsNumber({}, { message: 'laborCost debe ser un número' })
  @Min(0)
  laborCost?: number;
}
