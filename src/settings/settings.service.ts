import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import {
  BusinessSettings,
  TenantSettingsResponse,
} from './interfaces/settings-response.interface';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(SettingsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getSettings(): Promise<TenantSettingsResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapTenant(tenant);
  }

  async updateSettings(dto: UpdateTenantDto): Promise<TenantSettingsResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.logoUrl !== undefined) data.logo_url = dto.logoUrl;

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    this.logger.info({ tenantId }, 'Tenant settings updated');

    return this.mapTenant(tenant);
  }

  async updateBusinessSettings(
    dto: UpdateBusinessSettingsDto,
  ): Promise<TenantSettingsResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = this.parseSettings(existing.settings);

    const updatedSettings: BusinessSettings = { ...currentSettings };
    if (dto.currency !== undefined) updatedSettings.currency = dto.currency;
    if (dto.taxRate !== undefined) updatedSettings.taxRate = dto.taxRate;
    if (dto.defaultPaymentTerms !== undefined)
      updatedSettings.defaultPaymentTerms = dto.defaultPaymentTerms;
    if (dto.workingHours !== undefined)
      updatedSettings.workingHours = dto.workingHours;

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings as Prisma.InputJsonValue },
    });

    this.logger.info({ tenantId }, 'Tenant business settings updated');

    return this.mapTenant(tenant);
  }

  private parseSettings(raw: unknown): BusinessSettings {
    if (!raw || typeof raw !== 'object') {
      return {};
    }
    return raw as BusinessSettings;
  }

  private mapTenant(tenant: {
    id: string;
    name: string;
    ruc: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    settings: unknown;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): TenantSettingsResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      ruc: tenant.ruc,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      logoUrl: tenant.logo_url,
      settings: this.parseSettings(tenant.settings),
      isActive: tenant.is_active,
      createdAt: tenant.created_at.toISOString(),
      updatedAt: tenant.updated_at.toISOString(),
    };
  }
}
