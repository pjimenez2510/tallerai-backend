import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../auth';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchasesService } from './purchases.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Purchases')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @RequirePermissions('purchases.create')
  @ApiOperation({ summary: 'Crear orden de compra' })
  @ApiResponse({ status: 201, description: 'Orden de compra creada' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async create(@Body() dto: CreatePurchaseOrderDto) {
    const data = await this.purchasesService.create(dto);
    return { message: 'Orden de compra creada exitosamente', data };
  }

  @Get()
  @RequirePermissions('purchases.view')
  @ApiOperation({ summary: 'Listar órdenes de compra del taller (paginado)' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de órdenes de compra',
  })
  async findAll(@Query() pagination: PaginationDto) {
    const data = await this.purchasesService.findAll(pagination);
    return { message: 'Órdenes de compra obtenidas exitosamente', data };
  }

  @Get(':id')
  @RequirePermissions('purchases.view')
  @ApiOperation({ summary: 'Obtener orden de compra por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Orden de compra encontrada' })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.purchasesService.findOne(id);
    return { message: 'Orden de compra obtenida exitosamente', data };
  }

  @Patch(':id/receive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('purchases.receive')
  @ApiOperation({
    summary:
      'Marcar orden de compra como recibida: actualiza stock y costo promedio ponderado',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Orden recibida, stock y costos actualizados',
  })
  @ApiResponse({
    status: 400,
    description: 'La orden no está en estado pendiente',
  })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async receive(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.purchasesService.receive(id);
    return {
      message:
        'Orden de compra recibida. Stock y costos actualizados exitosamente',
      data,
    };
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('purchases.cancel')
  @ApiOperation({ summary: 'Cancelar orden de compra' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Orden de compra cancelada' })
  @ApiResponse({
    status: 400,
    description: 'La orden no está en estado pendiente',
  })
  @ApiResponse({ status: 404, description: 'Orden de compra no encontrada' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.purchasesService.cancel(id);
    return { message: 'Orden de compra cancelada exitosamente', data };
  }
}
