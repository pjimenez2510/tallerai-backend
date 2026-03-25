import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de notificaciones' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsDto,
  ) {
    const data = await this.notificationsService.findAll(user.id, query);
    return { message: 'Notifications retrieved successfully', data };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Obtener cantidad de notificaciones no leídas' })
  @ApiResponse({
    status: 200,
    description: 'Cantidad de notificaciones no leídas',
  })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.notificationsService.getUnreadCount(user.id);
    return { message: 'Unread count retrieved successfully', data };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.notificationsService.markAsRead(id, user.id);
    return { message: 'Notification marked as read', data };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiResponse({
    status: 200,
    description: 'Todas las notificaciones marcadas como leídas',
  })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { message: 'All notifications marked as read', data: null };
  }
}
