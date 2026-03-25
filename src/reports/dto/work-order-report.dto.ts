import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

const VALID_STATUSES = [
  'recepcion',
  'diagnostico',
  'aprobado',
  'en_progreso',
  'completado',
  'entregado',
  'cancelado',
] as const;

export class WorkOrderReportDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: VALID_STATUSES,
  })
  @IsOptional()
  @IsIn(VALID_STATUSES)
  status?: string;
}
