import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TenantContext } from '../common/tenant/tenant.context';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponse } from './interfaces/service-response.interface';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(ServicesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateServiceDto): Promise<ServiceResponse> {
    const tenantId = this.tenantContext.getTenantId();
    await this.assertCodeNotTaken(dto.code, tenantId);

    const service = await this.prisma.service.create({
      data: {
        tenant_id: tenantId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        price: dto.price,
      },
    });

    this.logger.info(
      { serviceId: service.id, tenantId, code: service.code },
      'Service created',
    );

    return this.mapService(service);
  }

  async findAll(): Promise<ServiceResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const services = await this.prisma.service.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { name: 'asc' },
    });

    return services.map((s) => this.mapService(s));
  }

  async findOne(id: string): Promise<ServiceResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const service = await this.prisma.service.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    return this.mapService(service);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.service.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Servicio no encontrado');
    }

    if (dto.code && dto.code.toUpperCase() !== existing.code) {
      await this.assertCodeNotTaken(dto.code, tenantId);
    }

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;

    const service = await this.prisma.service.update({
      where: { id },
      data,
    });

    this.logger.info({ serviceId: id, tenantId }, 'Service updated');

    return this.mapService(service);
  }

  async deactivate(id: string): Promise<ServiceResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.service.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const service = await this.prisma.service.update({
      where: { id },
      data: { is_active: false },
    });

    this.logger.info({ serviceId: id, tenantId }, 'Service deactivated');

    return this.mapService(service);
  }

  private async assertCodeNotTaken(
    code: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.service.findFirst({
      where: { code: code.toUpperCase(), tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un servicio con este código en el taller',
      );
    }
  }

  private mapService(service: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price: Prisma.Decimal;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): ServiceResponse {
    return {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      price: Number(service.price),
      isActive: service.is_active,
      createdAt: service.created_at.toISOString(),
      updatedAt: service.updated_at.toISOString(),
    };
  }
}
