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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../auth';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Crear usuario del taller' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado en el taller' })
  async create(@Body() dto: CreateUserDto) {
    const data = await this.usersService.create(dto);
    return { message: 'Usuario creado exitosamente', data };
  }

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Listar usuarios del taller (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuarios' })
  async findAll(@Query() pagination: PaginationDto) {
    const data = await this.usersService.findAll(pagination);
    return { message: 'Usuarios obtenidos exitosamente', data };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.findOne(id);
    return { message: 'Usuario obtenido exitosamente', data };
  }

  @Patch(':id')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Actualizar usuario del taller' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado en el taller' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const data = await this.usersService.update(id, dto);
    return { message: 'Usuario actualizado exitosamente', data };
  }

  @Delete(':id')
  @RequirePermissions('users.deactivate')
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.deactivate(id);
    return { message: 'Usuario desactivado exitosamente', data };
  }

  @Patch(':id/activate')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Reactivar usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario reactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.activate(id);
    return { message: 'Usuario reactivado exitosamente', data };
  }
}
