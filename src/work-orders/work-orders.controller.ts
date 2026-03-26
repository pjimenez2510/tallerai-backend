import {
  Body,
  Controller,
  Delete,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkOrderStatus } from '@prisma/client';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../auth';
import { AddPartDto } from './dto/add-part.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateSupplementDto } from './dto/create-supplement.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('Work Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @RequirePermissions('work_orders.create')
  @ApiOperation({ summary: 'Crear orden de trabajo' })
  @ApiResponse({ status: 201, description: 'OT creada' })
  async create(@Body() dto: CreateWorkOrderDto) {
    const data = await this.workOrdersService.create(dto);
    return { message: 'Orden de trabajo creada exitosamente', data };
  }

  @Get()
  @RequirePermissions('work_orders.view')
  @ApiOperation({ summary: 'Listar órdenes de trabajo' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WorkOrderStatus,
    description: 'Filtrar por estado',
  })
  @ApiResponse({ status: 200, description: 'Lista de OTs' })
  async findAll(@Query('status') status?: WorkOrderStatus) {
    const data = await this.workOrdersService.findAll(status);
    return { message: 'Órdenes de trabajo obtenidas exitosamente', data };
  }

  @Get('by-client/:clientId')
  @RequirePermissions('work_orders.view')
  @ApiOperation({ summary: 'Listar órdenes de trabajo de un cliente' })
  @ApiParam({ name: 'clientId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de OTs del cliente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    const data = await this.workOrdersService.findByClient(clientId);
    return {
      message: 'Órdenes de trabajo del cliente obtenidas exitosamente',
      data,
    };
  }

  @Get('by-vehicle/:vehicleId')
  @RequirePermissions('work_orders.view')
  @ApiOperation({ summary: 'Listar órdenes de trabajo de un vehículo' })
  @ApiParam({ name: 'vehicleId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de OTs del vehículo' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async findByVehicle(@Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    const data = await this.workOrdersService.findByVehicle(vehicleId);
    return {
      message: 'Órdenes de trabajo del vehículo obtenidas exitosamente',
      data,
    };
  }

  @Get('by-vehicle/:vehicleId/timeline')
  @RequirePermissions('work_orders.view')
  @ApiOperation({
    summary: 'Timeline de historial de órdenes de trabajo de un vehículo',
  })
  @ApiParam({ name: 'vehicleId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Timeline del vehículo' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async getVehicleTimeline(
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    const data = await this.workOrdersService.getVehicleTimeline(vehicleId);
    return {
      message: 'Timeline del vehículo obtenido exitosamente',
      data,
    };
  }

  @Post(':id/supplement')
  @RequirePermissions('work_orders.create')
  @ApiOperation({
    summary: 'Crear orden de trabajo suplementaria vinculada a la original',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'OT suplementaria creada' })
  @ApiResponse({ status: 404, description: 'OT padre no encontrada' })
  async createSupplement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupplementDto,
  ) {
    const data = await this.workOrdersService.createSupplement(id, dto);
    return {
      message: 'Orden de trabajo suplementaria creada exitosamente',
      data,
    };
  }

  @Get(':id/quote')
  @RequirePermissions('work_orders.view')
  @ApiOperation({ summary: 'Generar cotización de orden de trabajo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cotización generada' })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async getQuote(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workOrdersService.getQuote(id);
    return { message: 'Cotización generada exitosamente', data };
  }

  @Get(':id')
  @RequirePermissions('work_orders.view')
  @ApiOperation({ summary: 'Obtener orden de trabajo por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OT encontrada' })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workOrdersService.findOne(id);
    return { message: 'Orden de trabajo obtenida exitosamente', data };
  }

  @Patch(':id')
  @RequirePermissions('work_orders.edit')
  @ApiOperation({
    summary: 'Actualizar OT (estado, diagnóstico, asignación, etc.)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OT actualizada' })
  @ApiResponse({ status: 400, description: 'Transición de estado inválida' })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    const data = await this.workOrdersService.update(id, dto);
    return { message: 'Orden de trabajo actualizada exitosamente', data };
  }

  // ===== Tasks =====

  @Post(':id/tasks')
  @RequirePermissions('work_orders.edit')
  @ApiOperation({ summary: 'Agregar tarea a una orden de trabajo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Tarea agregada' })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async addTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTaskDto,
  ) {
    const data = await this.workOrdersService.addTask(id, dto);
    return { message: 'Tarea agregada exitosamente', data };
  }

  @Patch(':woId/tasks/:taskId')
  @RequirePermissions('work_orders.edit')
  @ApiOperation({ summary: 'Actualizar tarea de una orden de trabajo' })
  @ApiParam({ name: 'woId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tarea actualizada' })
  @ApiResponse({ status: 404, description: 'Tarea u OT no encontrada' })
  async updateTask(
    @Param('woId', ParseUUIDPipe) woId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const data = await this.workOrdersService.updateTask(woId, taskId, dto);
    return { message: 'Tarea actualizada exitosamente', data };
  }

  @Delete(':woId/tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('work_orders.edit')
  @ApiOperation({ summary: 'Eliminar tarea de una orden de trabajo' })
  @ApiParam({ name: 'woId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tarea eliminada' })
  @ApiResponse({ status: 404, description: 'Tarea u OT no encontrada' })
  async removeTask(
    @Param('woId', ParseUUIDPipe) woId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    await this.workOrdersService.removeTask(woId, taskId);
    return { message: 'Tarea eliminada exitosamente', data: null };
  }

  // ===== Parts =====

  @Post(':id/parts')
  @RequirePermissions('work_orders.edit')
  @ApiOperation({
    summary: 'Agregar repuesto a OT (descuenta stock automáticamente)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Repuesto agregado y stock descontado',
  })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 404, description: 'OT o producto no encontrado' })
  async addPart(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPartDto,
  ) {
    const data = await this.workOrdersService.addPart(id, dto);
    return {
      message: 'Repuesto agregado y stock descontado exitosamente',
      data,
    };
  }

  @Delete(':woId/parts/:partId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('work_orders.edit')
  @ApiOperation({ summary: 'Eliminar repuesto de OT (restaura stock)' })
  @ApiParam({ name: 'woId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'partId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Repuesto eliminado y stock restaurado',
  })
  @ApiResponse({ status: 404, description: 'Repuesto u OT no encontrado' })
  async removePart(
    @Param('woId', ParseUUIDPipe) woId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
  ) {
    await this.workOrdersService.removePart(woId, partId);
    return {
      message: 'Repuesto eliminado y stock restaurado exitosamente',
      data: null,
    };
  }

  // ===== Attachments =====

  @Post(':id/attachments')
  @RequirePermissions('work_orders.edit')
  @ApiOperation({ summary: 'Subir archivo adjunto a una orden de trabajo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Archivo adjunto subido' })
  @ApiResponse({
    status: 400,
    description: 'Tipo de archivo o tamaño inválido',
  })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAttachmentDto,
  ) {
    const data = await this.workOrdersService.addAttachment(id, dto);
    return { message: 'Archivo adjunto subido exitosamente', data };
  }

  @Get(':id/attachments')
  @RequirePermissions('work_orders.view')
  @ApiOperation({ summary: 'Listar archivos adjuntos de una orden de trabajo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos adjuntos (sin datos binarios)',
  })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async listAttachments(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workOrdersService.listAttachments(id);
    return { message: 'Archivos adjuntos obtenidos exitosamente', data };
  }

  @Get(':woId/attachments/:attachmentId')
  @RequirePermissions('work_orders.view')
  @ApiOperation({
    summary: 'Obtener archivo adjunto completo (con datos en base64)',
  })
  @ApiParam({ name: 'woId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'attachmentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Archivo adjunto completo' })
  @ApiResponse({
    status: 404,
    description: 'Archivo adjunto u OT no encontrado',
  })
  async getAttachment(
    @Param('woId', ParseUUIDPipe) woId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    const data = await this.workOrdersService.getAttachment(woId, attachmentId);
    return { message: 'Archivo adjunto obtenido exitosamente', data };
  }

  @Delete(':woId/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('work_orders.edit')
  @ApiOperation({ summary: 'Eliminar archivo adjunto de una orden de trabajo' })
  @ApiParam({ name: 'woId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'attachmentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Archivo adjunto eliminado' })
  @ApiResponse({
    status: 404,
    description: 'Archivo adjunto u OT no encontrado',
  })
  async removeAttachment(
    @Param('woId', ParseUUIDPipe) woId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    await this.workOrdersService.removeAttachment(woId, attachmentId);
    return { message: 'Archivo adjunto eliminado exitosamente', data: null };
  }
}
