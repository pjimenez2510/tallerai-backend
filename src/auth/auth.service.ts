import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import {
  AuthTenantPayload,
  AuthUserPayload,
  JwtPayload,
  RegisterResponse,
} from './interfaces/auth-response.interface';

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_DAYS = 7;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    await this.assertRucNotTaken(dto.tenantRuc);
    await this.assertEmailNotTaken(dto.adminEmail);

    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);
    const { tenant, user } = await this.createTenantWithAdmin(
      dto,
      passwordHash,
    );

    const accessToken = this.signAccessToken(
      user.id,
      tenant.id,
      user.role,
      user.email,
    );
    const refreshToken = this.signRefreshToken(user.id);
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.storeRefreshToken(user.id, tokenHash);

    this.logger.info(
      { tenantId: tenant.id, userId: user.id },
      'Tenant registered',
    );

    return {
      user: this.mapUser(user, tenant.id),
      tenant: this.mapTenant(tenant),
      accessToken,
      refreshToken,
    };
  }

  private async assertRucNotTaken(ruc: string): Promise<void> {
    const existing = await this.prisma.tenant.findUnique({ where: { ruc } });
    if (existing) {
      throw new ConflictException(
        'Ya existe un taller registrado con este RUC',
      );
    }
  }

  private async assertEmailNotTaken(email: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new ConflictException('Este correo electrónico ya está registrado');
    }
  }

  private async createTenantWithAdmin(dto: RegisterDto, passwordHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, ruc: dto.tenantRuc },
      });

      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          name: dto.adminName,
          email: dto.adminEmail,
          password_hash: passwordHash,
          role: UserRole.admin,
          phone: dto.adminPhone,
        },
      });

      return { tenant, user };
    });
  }

  private signAccessToken(
    userId: string,
    tenantId: string,
    role: UserRole,
    email: string,
  ): string {
    const payload: JwtPayload = { sub: userId, tenantId, role, email };
    const secret = this.configService.get<string>('jwt.secret');
    const rawExpiry =
      this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';
    return this.jwtService.sign(payload, {
      secret,
      expiresIn: rawExpiry as StringValue,
    });
  }

  private signRefreshToken(userId: string): string {
    const secret = this.configService.get<string>('jwt.refreshSecret');
    const rawExpiry =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';
    return this.jwtService.sign(
      { sub: userId },
      { secret, expiresIn: rawExpiry as StringValue },
    );
  }

  private async storeRefreshToken(
    userId: string,
    tokenHash: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * MS_PER_DAY);
    await this.prisma.refreshToken.create({
      data: { user_id: userId, token_hash: tokenHash, expires_at: expiresAt },
    });
  }

  private mapUser(
    user: { id: string; name: string; email: string; role: UserRole },
    tenantId: string,
  ): AuthUserPayload {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId,
    };
  }

  private mapTenant(tenant: {
    id: string;
    name: string;
    ruc: string;
  }): AuthTenantPayload {
    return { id: tenant.id, name: tenant.name, ruc: tenant.ruc };
  }
}
