import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles(
    UserRole.admin,
    UserRole.jefe_taller,
    UserRole.recepcionista,
    UserRole.mecanico,
  )
  @ApiOperation({ summary: 'Obtener métricas del dashboard' })
  @ApiResponse({ status: 200, description: 'Métricas del taller' })
  async getMetrics() {
    const data = await this.dashboardService.getMetrics();
    return { message: 'Métricas obtenidas exitosamente', data };
  }

  @Get('productivity')
  @Roles(UserRole.admin, UserRole.jefe_taller)
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
