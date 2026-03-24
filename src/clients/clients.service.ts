import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponse } from './interfaces/client-response.interface';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(ClientsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateClientDto): Promise<ClientResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertDocumentNotTaken(dto.documentNumber, tenantId);

    const client = await this.prisma.client.create({
      data: {
        tenant_id: tenantId,
        document_type: dto.documentType,
        document_number: dto.documentNumber,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        phone_secondary: dto.phoneSecondary,
        address: dto.address,
        notes: dto.notes,
      },
    });

    this.logger.info({ clientId: client.id, tenantId }, 'Client created');

    return this.mapClient(client);
  }

  async findAll(): Promise<ClientResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const clients = await this.prisma.client.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { created_at: 'desc' },
    });

    return clients.map((c) => this.mapClient(c));
  }

  async findOne(id: string): Promise<ClientResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const client = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return this.mapClient(client);
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (dto.documentNumber && dto.documentNumber !== existing.document_number) {
      await this.assertDocumentNotTaken(dto.documentNumber, tenantId);
    }

    const data: Record<string, unknown> = {};
    if (dto.documentType !== undefined) data.document_type = dto.documentType;
    if (dto.documentNumber !== undefined)
      data.document_number = dto.documentNumber;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.phoneSecondary !== undefined)
      data.phone_secondary = dto.phoneSecondary;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const client = await this.prisma.client.update({
      where: { id },
      data,
    });

    this.logger.info({ clientId: id, tenantId }, 'Client updated');

    return this.mapClient(client);
  }

  async deactivate(id: string): Promise<ClientResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: { is_active: false },
    });

    this.logger.info({ clientId: id, tenantId }, 'Client deactivated');

    return this.mapClient(client);
  }

  async activate(id: string): Promise<ClientResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: { is_active: true },
    });

    this.logger.info({ clientId: id, tenantId }, 'Client activated');

    return this.mapClient(client);
  }

  async search(query: string): Promise<ClientResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const clients = await this.prisma.client.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { document_number: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return clients.map((c) => this.mapClient(c));
  }

  private async assertDocumentNotTaken(
    documentNumber: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.client.findFirst({
      where: { document_number: documentNumber, tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un cliente con este número de documento en el taller',
      );
    }
  }

  private mapClient(client: {
    id: string;
    document_type: string;
    document_number: string;
    name: string;
    email: string | null;
    phone: string | null;
    phone_secondary: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): ClientResponse {
    return {
      id: client.id,
      documentType: client.document_type as ClientResponse['documentType'],
      documentNumber: client.document_number,
      name: client.name,
      email: client.email,
      phone: client.phone,
      phoneSecondary: client.phone_secondary,
      address: client.address,
      notes: client.notes,
      isActive: client.is_active,
      createdAt: client.created_at.toISOString(),
      updatedAt: client.updated_at.toISOString(),
    };
  }
}
