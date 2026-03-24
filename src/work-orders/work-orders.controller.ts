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
import { UserRole, WorkOrderStatus } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { AddPartDto } from './dto/add-part.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('Work Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.jefe_taller, UserRole.recepcionista)
  @ApiOperation({ summary: 'Crear orden de trabajo' })
  @ApiResponse({ status: 201, description: 'OT creada' })
  async create(@Body() dto: CreateWorkOrderDto) {
    const data = await this.workOrdersService.create(dto);
    return { message: 'Orden de trabajo creada exitosamente', data };
  }

  @Get()
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
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

  @Get(':id')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Obtener orden de trabajo por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'OT encontrada' })
  @ApiResponse({ status: 404, description: 'OT no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.workOrdersService.findOne(id);
    return { message: 'Orden de trabajo obtenida exitosamente', data };
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller, UserRole.recepcionista)
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
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
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
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
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
  @Roles(UserRole.admin, UserRole.jefe_taller, UserRole.recepcionista)
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
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
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
  @Roles(UserRole.admin, UserRole.jefe_taller, UserRole.recepcionista)
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
}
