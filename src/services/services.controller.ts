import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @RequirePermissions('services.create')
  @ApiOperation({ summary: 'Crear servicio del taller' })
  @ApiResponse({ status: 201, description: 'Servicio creado' })
  @ApiResponse({ status: 409, description: 'Código ya existe en el taller' })
  async create(@Body() dto: CreateServiceDto) {
    const data = await this.servicesService.create(dto);
    return { message: 'Servicio creado exitosamente', data };
  }

  @Get()
  @RequirePermissions('services.view')
  @ApiOperation({ summary: 'Listar servicios activos del taller' })
  @ApiResponse({ status: 200, description: 'Lista de servicios' })
  async findAll() {
    const data = await this.servicesService.findAll();
    return { message: 'Servicios obtenidos exitosamente', data };
  }

  @Get(':id')
  @RequirePermissions('services.view')
  @ApiOperation({ summary: 'Obtener servicio por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Servicio encontrado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.servicesService.findOne(id);
    return { message: 'Servicio obtenido exitosamente', data };
  }

  @Patch(':id')
  @RequirePermissions('services.edit')
  @ApiOperation({ summary: 'Actualizar servicio' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Servicio actualizado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  @ApiResponse({ status: 409, description: 'Código ya existe en el taller' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const data = await this.servicesService.update(id, dto);
    return { message: 'Servicio actualizado exitosamente', data };
  }

  @Delete(':id')
  @RequirePermissions('services.delete')
  @ApiOperation({ summary: 'Desactivar servicio (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Servicio desactivado' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.servicesService.deactivate(id);
    return { message: 'Servicio desactivado exitosamente', data };
  }
}
