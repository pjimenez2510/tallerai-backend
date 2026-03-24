import {
  Body,
  Controller,
  Get,
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
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
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
}
