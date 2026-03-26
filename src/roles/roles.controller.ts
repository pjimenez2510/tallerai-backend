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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('permissions')
  @RequirePermissions('roles.view')
  @ApiOperation({
    summary: 'Get all available permissions grouped by module',
  })
  @ApiResponse({ status: 200, description: 'Permissions grouped by module' })
  getAvailablePermissions() {
    const data = this.rolesService.getAvailablePermissions();
    return { message: 'Available permissions retrieved successfully', data };
  }

  @Get()
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'List all roles for the tenant' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async findAll() {
    const data = await this.rolesService.findAll();
    return { message: 'Roles retrieved successfully', data };
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'Get role by ID with user count' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role found' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rolesService.findOne(id);
    return { message: 'Role retrieved successfully', data };
  }

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a custom role for the tenant' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(@Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create(dto);
    return { message: 'Role created successfully', data };
  }

  @Patch(':id')
  @RequirePermissions('roles.edit')
  @ApiOperation({ summary: 'Update role name, description or permissions' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const data = await this.rolesService.update(id, dto);
    return { message: 'Role updated successfully', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('roles.delete')
  @ApiOperation({
    summary: 'Delete a custom role (only if non-system and no users assigned)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system role or role with users',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.rolesService.delete(id);
    return { message: 'Role deleted successfully', data: null };
  }
}
