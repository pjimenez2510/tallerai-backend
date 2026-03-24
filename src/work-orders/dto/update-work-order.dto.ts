import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import {
  IsDateString,
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

  @ApiPropertyOptional({
    example: '2026-04-01T18:00:00.000Z',
    description: 'Fecha prometida de entrega (ISO 8601)',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'La fecha estimada debe ser una fecha válida en formato ISO 8601',
    },
  )
  estimatedDate?: string;
}
