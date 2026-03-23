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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Crear usuario del taller' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado en el taller' })
  async create(@Body() dto: CreateUserDto) {
    const data = await this.usersService.create(dto);
    return { message: 'Usuario creado exitosamente', data };
  }

  @Get()
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Listar usuarios del taller' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll() {
    const data = await this.usersService.findAll();
    return { message: 'Usuarios obtenidos exitosamente', data };
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.findOne(id);
    return { message: 'Usuario obtenido exitosamente', data };
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.jefe_taller)
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
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.deactivate(id);
    return { message: 'Usuario desactivado exitosamente', data };
  }

  @Patch(':id/activate')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Reactivar usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario reactivado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.activate(id);
    return { message: 'Usuario reactivado exitosamente', data };
  }
}
