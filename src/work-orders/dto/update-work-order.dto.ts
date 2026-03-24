import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus, { message: 'Estado inválido' })
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: WorkOrderPriority })
  @IsOptional()
  @IsEnum(WorkOrderPriority, { message: 'Prioridad inválida' })
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ example: 'Descripción actualizada' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Diagnóstico: pastillas desgastadas' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Notas internas del taller' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  internalNotes?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del mecánico debe ser un UUID válido' })
  assignedTo?: string | null;
}
