import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
} from '../auth';
import { MechanicService } from './mechanic.service';

@ApiTags('Mechanic')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('mechanic.view')
@Controller('mechanic')
export class MechanicController {
  constructor(private readonly mechanicService: MechanicService) {}

  @Get('my-tasks')
  @ApiOperation({
    summary: 'Obtener órdenes de trabajo asignadas al mecánico autenticado',
  })
  @ApiResponse({ status: 200, description: 'Órdenes de trabajo asignadas' })
  async getMyTasks(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.mechanicService.getMyTasks(user.id);
    return { message: 'Tareas obtenidas exitosamente', data };
  }

  @Patch('tasks/:taskId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('mechanic.complete_tasks')
  @ApiOperation({ summary: 'Alternar estado de completado de una tarea' })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Estado de tarea actualizado' })
  @ApiResponse({
    status: 404,
    description: 'Tarea no encontrada o no asignada a este mecánico',
  })
  async toggleTaskComplete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    const data = await this.mechanicService.toggleTaskComplete(user.id, taskId);
    return { message: 'Estado de tarea actualizado exitosamente', data };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Obtener resumen de trabajo del mecánico' })
  @ApiResponse({ status: 200, description: 'Resumen del mecánico' })
  async getSummary(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.mechanicService.getSummary(user.id);
    return { message: 'Resumen obtenido exitosamente', data };
  }
}
