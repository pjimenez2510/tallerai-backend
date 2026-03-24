import {
  Body,
  Controller,
  Delete,
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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.jefe_taller, UserRole.recepcionista)
  @ApiOperation({ summary: 'Registrar nuevo vehículo' })
  @ApiResponse({ status: 201, description: 'Vehículo creado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 409, description: 'Placa ya registrada en el taller' })
  async create(@Body() dto: CreateVehicleDto) {
    const data = await this.vehiclesService.create(dto);
    return { message: 'Vehículo registrado exitosamente', data };
  }

  @Get()
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Listar vehículos del taller' })
  @ApiResponse({ status: 200, description: 'Lista de vehículos' })
  async findAll() {
    const data = await this.vehiclesService.findAll();
    return { message: 'Vehículos obtenidos exitosamente', data };
  }

  @Get('search')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({
    summary: 'Buscar vehículos por placa, marca, modelo o cliente',
  })
  @ApiQuery({ name: 'q', type: 'string', description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  async search(@Query('q') query: string) {
    const data = await this.vehiclesService.search(query ?? '');
    return { message: 'Búsqueda completada', data };
  }

  @Get('by-plate/:plate')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Buscar vehículo por placa exacta' })
  @ApiParam({ name: 'plate', type: 'string' })
  @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async findByPlate(@Param('plate') plate: string) {
    const data = await this.vehiclesService.findByPlate(plate);
    return { message: 'Vehículo obtenido exitosamente', data };
  }

  @Get('by-client/:clientId')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Listar vehículos de un cliente' })
  @ApiParam({ name: 'clientId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Vehículos del cliente' })
  async findByClient(@Param('clientId', ParseUUIDPipe) clientId: string) {
    const data = await this.vehiclesService.findByClient(clientId);
    return { message: 'Vehículos del cliente obtenidos exitosamente', data };
  }

  @Get(':id')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Obtener vehículo por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Vehículo encontrado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.vehiclesService.findOne(id);
    return { message: 'Vehículo obtenido exitosamente', data };
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller, UserRole.recepcionista)
  @ApiOperation({ summary: 'Actualizar datos del vehículo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Vehículo actualizado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  @ApiResponse({ status: 409, description: 'Placa ya registrada en el taller' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    const data = await this.vehiclesService.update(id, dto);
    return { message: 'Vehículo actualizado exitosamente', data };
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Desactivar vehículo (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Vehículo desactivado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.vehiclesService.deactivate(id);
    return { message: 'Vehículo desactivado exitosamente', data };
  }
}
