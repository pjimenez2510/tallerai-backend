import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import {
  CreateNotificationDto,
  NotificationResponse,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
} from './interfaces/notification-response.interface';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(NotificationsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const metadata: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
      dto.metadata !== undefined
        ? (dto.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull;

    const notification = await this.prisma.notification.create({
      data: {
        tenant_id: dto.tenantId,
        user_id: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata,
      },
    });

    this.logger.info(
      { notificationId: notification.id, userId: dto.userId, type: dto.type },
      'Notification created',
    );

    return this.mapNotification(notification);
  }

  async findAll(
    userId: string,
    dto: ListNotificationsDto,
  ): Promise<PaginatedNotificationsResponse> {
    const tenantId = this.tenantContext.getTenantId();
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { tenant_id: tenantId, user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { tenant_id: tenantId, user_id: userId },
      }),
    ]);

    return {
      items: items.map((n) => this.mapNotification(n)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const count = await this.prisma.notification.count({
      where: { tenant_id: tenantId, user_id: userId, is_read: false },
    });

    return { count };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.notification.findFirst({
      where: { id, tenant_id: tenantId, user_id: userId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const notification = await this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });

    return this.mapNotification(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    await this.prisma.notification.updateMany({
      where: { tenant_id: tenantId, user_id: userId, is_read: false },
      data: { is_read: true },
    });

    this.logger.info({ userId, tenantId }, 'All notifications marked as read');
  }

  private mapNotification(notification: {
    id: string;
    tenant_id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    metadata: unknown;
    created_at: Date;
  }): NotificationResponse {
    return {
      id: notification.id,
      tenantId: notification.tenant_id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.is_read,
      metadata:
        notification.metadata &&
        typeof notification.metadata === 'object' &&
        !Array.isArray(notification.metadata)
          ? (notification.metadata as Record<string, unknown>)
          : null,
      createdAt: notification.created_at.toISOString(),
    };
  }
}
