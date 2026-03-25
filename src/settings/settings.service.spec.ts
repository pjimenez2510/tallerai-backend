import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { SettingsService } from './settings.service';

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const TENANT_ID = 'tenant-001';

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

function makeTenant(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TENANT_ID,
    name: 'Taller Central',
    ruc: '0912345678001',
    address: 'Av. Principal 123',
    phone: '0999999999',
    email: 'taller@example.com',
    logo_url: null,
    settings: { currency: 'USD', taxRate: 12 },
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettingsService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('getSettings', () => {
    it('should return tenant settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());

      const result = await service.getSettings();

      expect(result.id).toBe(TENANT_ID);
      expect(result.name).toBe('Taller Central');
      expect(result.settings).toEqual({ currency: 'USD', taxRate: 12 });
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getSettings()).rejects.toThrow(NotFoundException);
    });

    it('should return empty settings object when settings is null', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(
        makeTenant({ settings: null }),
      );

      const result = await service.getSettings();

      expect(result.settings).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should update tenant profile settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      mockPrisma.tenant.update.mockResolvedValue(
        makeTenant({ name: 'Taller Nuevo' }),
      );

      const result = await service.updateSettings({ name: 'Taller Nuevo' });

      expect(result.name).toBe('Taller Nuevo');
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { name: 'Taller Nuevo' },
      });
    });

    it('should map logoUrl to logo_url', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      mockPrisma.tenant.update.mockResolvedValue(
        makeTenant({ logo_url: 'https://example.com/logo.png' }),
      );

      await service.updateSettings({
        logoUrl: 'https://example.com/logo.png',
      });

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { logo_url: 'https://example.com/logo.png' },
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.updateSettings({ name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should log settings update', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      mockPrisma.tenant.update.mockResolvedValue(makeTenant());

      await service.updateSettings({ name: 'Updated' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { tenantId: TENANT_ID },
        'Tenant settings updated',
      );
    });
  });

  describe('updateBusinessSettings', () => {
    it('should merge business settings with existing ones', async () => {
      const existing = makeTenant({
        settings: { currency: 'USD', taxRate: 12 },
      });
      mockPrisma.tenant.findUnique.mockResolvedValue(existing);
      mockPrisma.tenant.update.mockResolvedValue(
        makeTenant({ settings: { currency: 'USD', taxRate: 15 } }),
      );

      const result = await service.updateBusinessSettings({ taxRate: 15 });

      expect(result.settings.taxRate).toBe(15);
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          settings: { currency: 'USD', taxRate: 15 },
        },
      });
    });

    it('should handle empty initial settings', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(
        makeTenant({ settings: null }),
      );
      mockPrisma.tenant.update.mockResolvedValue(
        makeTenant({ settings: { currency: 'USD' } }),
      );

      await service.updateBusinessSettings({ currency: 'USD' });

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { settings: { currency: 'USD' } },
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBusinessSettings({ currency: 'USD' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should log business settings update', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(makeTenant());
      mockPrisma.tenant.update.mockResolvedValue(makeTenant());

      await service.updateBusinessSettings({ currency: 'EUR' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { tenantId: TENANT_ID },
        'Tenant business settings updated',
      );
    });
  });
});
