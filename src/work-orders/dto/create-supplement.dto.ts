import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplementDto {
  @ApiProperty({
    example:
      'Reemplazo adicional de correa de distribución detectado durante la reparación',
  })
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ enum: WorkOrderPriority, example: 'normal' })
  @IsOptional()
  @IsEnum(WorkOrderPriority, {
    message: 'La prioridad debe ser: baja, normal, alta, urgente',
  })
  priority?: WorkOrderPriority;
}
