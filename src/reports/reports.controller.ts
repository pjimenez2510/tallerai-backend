import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth';
import { ReportsService } from './reports.service';
import { WorkOrderReportDto } from './dto/work-order-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.jefe_taller)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('work-orders')
  @ApiOperation({ summary: 'Exportar reporte de órdenes de trabajo' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Fecha inicio YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Fecha fin YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtrar por estado',
  })
  @ApiResponse({ status: 200, description: 'Datos de OTs para exportación' })
  async getWorkOrdersReport(@Query() query: WorkOrderReportDto) {
    const data = await this.reportsService.getWorkOrdersReport(query);
    return { message: 'Work orders report generated successfully', data };
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Exportar reporte de inventario' })
  @ApiResponse({
    status: 200,
    description: 'Datos de inventario para exportación',
  })
  async getInventoryReport() {
    const data = await this.reportsService.getInventoryReport();
    return { message: 'Inventory report generated successfully', data };
  }

  @Get('clients')
  @ApiOperation({ summary: 'Exportar reporte de clientes' })
  @ApiResponse({
    status: 200,
    description: 'Datos de clientes para exportación',
  })
  async getClientsReport() {
    const data = await this.reportsService.getClientsReport();
    return { message: 'Clients report generated successfully', data };
  }
}
