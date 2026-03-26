import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { ALL_PERMISSIONS } from '../auth/permissions/permissions.enum';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponse } from './interfaces/role-response.interface';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(RolesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async findAll(): Promise<RoleResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const roles = await this.prisma.role.findMany({
      where: { tenant_id: tenantId },
      include: { _count: { select: { users: true } } },
      orderBy: { created_at: 'asc' },
    });

    return roles.map((r) => this.mapRole(r, r._count.users));
  }

  async findOne(id: string): Promise<RoleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const role = await this.prisma.role.findFirst({
      where: { id, tenant_id: tenantId },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.mapRole(role, role._count.users);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertSlugNotTaken(dto.slug, tenantId);

    const role = await this.prisma.role.create({
      data: {
        tenant_id: tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        permissions: dto.permissions,
        is_system: false,
      },
    });

    this.logger.info({ roleId: role.id, tenantId }, 'Role created');

    return this.mapRole(role, 0);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.role.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.permissions !== undefined) data.permissions = dto.permissions;

    const role = await this.prisma.role.update({
      where: { id },
      data,
      include: { _count: { select: { users: true } } },
    });

    this.logger.info({ roleId: id, tenantId }, 'Role updated');

    return this.mapRole(role, role._count.users);
  }

  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();

    const role = await this.prisma.role.findFirst({
      where: { id, tenant_id: tenantId },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        'Cannot delete a role that has users assigned to it',
      );
    }

    await this.prisma.role.delete({ where: { id } });

    this.logger.info({ roleId: id, tenantId }, 'Role deleted');
  }

  getAvailablePermissions(): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    for (const permission of ALL_PERMISSIONS) {
      const [module] = permission.split('.');
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(permission);
    }
    return grouped;
  }

  private async assertSlugNotTaken(
    slug: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.role.findFirst({
      where: { slug, tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'A role with this slug already exists in your workspace',
      );
    }
  }

  private mapRole(
    role: {
      id: string;
      tenant_id: string;
      name: string;
      slug: string;
      description: string | null;
      permissions: string[];
      is_system: boolean;
      created_at: Date;
      updated_at: Date;
    },
    userCount: number,
  ): RoleResponse {
    return {
      id: role.id,
      tenantId: role.tenant_id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.is_system,
      userCount,
      createdAt: role.created_at.toISOString(),
      updatedAt: role.updated_at.toISOString(),
    };
  }
}
