import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('work-orders/:orderNumber')
  @ApiOperation({
    summary: 'Consultar estado de orden de trabajo (sin autenticación)',
    description:
      'Endpoint público para que los clientes consulten el estado de su vehículo escaneando el QR de la OT.',
  })
  @ApiParam({
    name: 'orderNumber',
    type: 'string',
    example: 'OT-2026-0001',
    description: 'Número de orden de trabajo',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado público de la orden de trabajo',
  })
  @ApiResponse({ status: 404, description: 'Orden de trabajo no encontrada' })
  async findWorkOrder(@Param('orderNumber') orderNumber: string) {
    const data = await this.publicService.findWorkOrderByNumber(orderNumber);
    return { message: 'Orden de trabajo obtenida exitosamente', data };
  }
}
