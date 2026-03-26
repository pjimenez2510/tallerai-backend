import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../auth';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Obtener métricas del dashboard' })
  @ApiResponse({ status: 200, description: 'Métricas del taller' })
  async getMetrics() {
    const data = await this.dashboardService.getMetrics();
    return { message: 'Métricas obtenidas exitosamente', data };
  }

  @Get('productivity')
  @RequirePermissions('dashboard.productivity')
  @ApiOperation({ summary: 'Obtener métricas de productividad del taller' })
  @ApiResponse({ status: 200, description: 'Métricas de productividad' })
  async getProductivity() {
    const data = await this.dashboardService.getProductivity();
    return {
      message: 'Métricas de productividad obtenidas exitosamente',
      data,
    };
  }
}
