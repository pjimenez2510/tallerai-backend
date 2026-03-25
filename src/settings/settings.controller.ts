import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { SettingsService } from './settings.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@ApiTags('Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración del taller' })
  @ApiResponse({ status: 200, description: 'Configuración del taller' })
  async getSettings() {
    const data = await this.settingsService.getSettings();
    return { message: 'Tenant settings retrieved successfully', data };
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar datos generales del taller' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  async updateSettings(@Body() dto: UpdateTenantDto) {
    const data = await this.settingsService.updateSettings(dto);
    return { message: 'Tenant settings updated successfully', data };
  }

  @Patch('business')
  @ApiOperation({ summary: 'Actualizar configuración de negocio del taller' })
  @ApiResponse({
    status: 200,
    description: 'Configuración de negocio actualizada',
  })
  async updateBusinessSettings(@Body() dto: UpdateBusinessSettingsDto) {
    const data = await this.settingsService.updateBusinessSettings(dto);
    return { message: 'Business settings updated successfully', data };
  }
}
