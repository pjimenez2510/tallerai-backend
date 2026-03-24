import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido' })
  clientId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID('4', { message: 'El ID del vehículo debe ser un UUID válido' })
  vehicleId!: string;

  @ApiProperty({ example: 'Revisión de frenos y cambio de pastillas' })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ enum: WorkOrderPriority, example: 'normal' })
  @IsOptional()
  @IsEnum(WorkOrderPriority, {
    message: 'La prioridad debe ser: baja, normal, alta, urgente',
  })
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileageIn?: number;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del mecánico debe ser un UUID válido' })
  assignedTo?: string;
}
