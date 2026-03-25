import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './interfaces/notification-response.interface';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

function makeNotification(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'notif-001',
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    type: 'ot_created',
    title: 'Nueva OT',
    message: 'Se creó una nueva orden de trabajo',
    is_read: false,
    metadata: null,
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto: CreateNotificationDto = {
      tenantId: TENANT_ID,
      userId: USER_ID,
      type: 'ot_created',
      title: 'Nueva OT',
      message: 'Se creó una nueva orden de trabajo',
    };

    it('should create a notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(makeNotification());

      const result = await service.create(dto);

      expect(result.id).toBe('notif-001');
      expect(result.type).toBe('ot_created');
      expect(result.isRead).toBe(false);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          tenant_id: TENANT_ID,
          user_id: USER_ID,
          type: 'ot_created',
          title: 'Nueva OT',
          message: 'Se creó una nueva orden de trabajo',
          metadata: Prisma.JsonNull,
        },
      });
    });

    it('should log notification creation', async () => {
      mockPrisma.notification.create.mockResolvedValue(makeNotification());

      await service.create(dto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { notificationId: 'notif-001', userId: USER_ID, type: 'ot_created' },
        'Notification created',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([makeNotification()]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll(USER_ID, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should use defaults when page/limit not provided', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll(USER_ID, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply correct skip for pagination', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll(USER_ID, { page: 3, limit: 10 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(45);

      const result = await service.findAll(USER_ID, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(USER_ID);

      expect(result.count).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID, user_id: USER_ID, is_read: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(makeNotification());
      mockPrisma.notification.update.mockResolvedValue(
        makeNotification({ is_read: true }),
      );

      const result = await service.markAsRead('notif-001', USER_ID);

      expect(result.isRead).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-001' },
        data: { is_read: true },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead(USER_ID);

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID, user_id: USER_ID, is_read: false },
        data: { is_read: true },
      });
    });

    it('should log the mark-all action', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await service.markAllAsRead(USER_ID);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: USER_ID, tenantId: TENANT_ID },
        'All notifications marked as read',
      );
    });
  });
});
