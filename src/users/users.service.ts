import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './interfaces/user-response.interface';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(UsersService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertEmailNotTakenInTenant(dto.email, tenantId);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        email: dto.email,
        password_hash: passwordHash,
        role: dto.role,
        phone: dto.phone,
      },
    });

    this.logger.info(
      { userId: user.id, tenantId, role: dto.role },
      'User created',
    );

    return this.mapUser(user);
  }

  async findAll(): Promise<UserResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const users = await this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });

    return users.map((u) => this.mapUser(u));
  }

  async findOne(id: string): Promise<UserResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.email && dto.email !== existing.email) {
      await this.assertEmailNotTakenInTenant(dto.email, tenantId);
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.password !== undefined) {
      data.password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    this.logger.info({ userId: id, tenantId }, 'User updated');

    return this.mapUser(user);
  }

  async deactivate(id: string): Promise<UserResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { is_active: false },
    });

    this.logger.info({ userId: id, tenantId }, 'User deactivated');

    return this.mapUser(user);
  }

  async activate(id: string): Promise<UserResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { is_active: true },
    });

    this.logger.info({ userId: id, tenantId }, 'User activated');

    return this.mapUser(user);
  }

  private async assertEmailNotTakenInTenant(
    email: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { email, tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un usuario con este email en el taller',
      );
    }
  }

  private mapUser(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserResponse['role'],
      phone: user.phone,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    };
  }
}
