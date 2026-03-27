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
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../auth';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsService } from './clients.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermissions('clients.create')
  @ApiOperation({ summary: 'Registrar nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado' })
  @ApiResponse({
    status: 409,
    description: 'Documento ya registrado en el taller',
  })
  async create(@Body() dto: CreateClientDto) {
    const data = await this.clientsService.create(dto);
    return { message: 'Cliente registrado exitosamente', data };
  }

  @Get()
  @RequirePermissions('clients.view')
  @ApiOperation({ summary: 'Listar clientes del taller (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de clientes' })
  async findAll(@Query() pagination: PaginationDto) {
    const data = await this.clientsService.findAll(pagination);
    return { message: 'Clientes obtenidos exitosamente', data };
  }

  @Get('search')
  @RequirePermissions('clients.view')
  @ApiOperation({
    summary: 'Buscar clientes por nombre, documento, teléfono o email',
  })
  @ApiQuery({ name: 'q', type: 'string', description: 'Término de búsqueda' })
  @ApiResponse({ status: 200, description: 'Resultados de búsqueda' })
  async search(@Query('q') query: string) {
    const data = await this.clientsService.search(query ?? '');
    return { message: 'Búsqueda completada', data };
  }

  @Get(':id')
  @RequirePermissions('clients.view')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.clientsService.findOne(id);
    return { message: 'Cliente obtenido exitosamente', data };
  }

  @Patch(':id')
  @RequirePermissions('clients.edit')
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Documento ya registrado en el taller',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const data = await this.clientsService.update(id, dto);
    return { message: 'Cliente actualizado exitosamente', data };
  }

  @Delete(':id')
  @RequirePermissions('clients.delete')
  @ApiOperation({ summary: 'Desactivar cliente (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cliente desactivado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.clientsService.deactivate(id);
    return { message: 'Cliente desactivado exitosamente', data };
  }

  @Patch(':id/activate')
  @RequirePermissions('clients.edit')
  @ApiOperation({ summary: 'Reactivar cliente' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cliente reactivado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.clientsService.activate(id);
    return { message: 'Cliente reactivado exitosamente', data };
  }
}
