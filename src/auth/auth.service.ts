import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AuthTenantPayload,
  AuthUserPayload,
  JwtPayload,
  LoginResponse,
  MeResponse,
  RefreshResponse,
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

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, is_active: true },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn({ email: dto.email }, 'Login failed: user not found');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordValid) {
      this.logger.warn(
        { userId: user.id, email: dto.email },
        'Login failed: invalid password',
      );
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.tenant.is_active) {
      this.logger.warn(
        { tenantId: user.tenant_id },
        'Login failed: tenant inactive',
      );
      throw new UnauthorizedException(
        'El taller se encuentra deshabilitado. Contacte al administrador.',
      );
    }

    const accessToken = this.signAccessToken(
      user.id,
      user.tenant_id,
      user.role,
      user.email,
    );
    const refreshToken = this.signRefreshToken(user.id);
    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.storeRefreshToken(user.id, tokenHash);

    this.logger.info(
      { userId: user.id, tenantId: user.tenant_id },
      'Login successful',
    );

    return {
      user: this.mapUser(user, user.tenant_id),
      tenant: this.mapTenant(user.tenant),
      accessToken,
      refreshToken,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<RefreshResponse> {
    const payload = this.verifyRefreshToken(dto.refreshToken);

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        user_id: payload.sub,
        is_revoked: false,
      },
    });

    let matchedTokenId: string | null = null;
    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(dto.refreshToken, stored.token_hash);
      if (isMatch) {
        matchedTokenId = stored.id;
        break;
      }
    }

    if (!matchedTokenId) {
      this.logger.warn(
        { userId: payload.sub },
        'Refresh failed: no matching token',
      );
      throw new UnauthorizedException('Token de refresco inválido');
    }

    const storedToken = storedTokens.find((t) => t.id === matchedTokenId);
    if (!storedToken || storedToken.expires_at < new Date()) {
      this.logger.warn(
        { userId: payload.sub },
        'Refresh failed: token expired',
      );
      throw new UnauthorizedException('Token de refresco expirado');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: { is_revoked: true },
    });

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, is_active: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const newAccessToken = this.signAccessToken(
      user.id,
      user.tenant_id,
      user.role,
      user.email,
    );
    const newRefreshToken = this.signRefreshToken(user.id);
    const newTokenHash = await bcrypt.hash(newRefreshToken, BCRYPT_ROUNDS);
    await this.storeRefreshToken(user.id, newTokenHash);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    let payload: { sub: string };
    try {
      payload = this.verifyRefreshToken(dto.refreshToken);
    } catch {
      // Even if token is invalid/expired, we don't leak info
      return;
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        user_id: payload.sub,
        is_revoked: false,
      },
    });

    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(dto.refreshToken, stored.token_hash);
      if (isMatch) {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { is_revoked: true },
        });
        this.logger.info(
          { userId: payload.sub },
          'Logout: refresh token revoked',
        );
        return;
      }
    }
  }

  async getMe(userId: string, tenantId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId, is_active: true },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      tenantId: user.tenant_id,
      tenantName: user.tenant.name,
    };
  }

  async updateProfile(
    userId: string,
    tenantId: string,
    dto: UpdateProfileDto,
  ): Promise<MeResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId, is_active: true },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatarUrl !== undefined) data.avatar_url = dto.avatarUrl;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { tenant: true },
    });

    this.logger.info({ userId, tenantId }, 'User profile updated');

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      phone: updated.phone,
      avatarUrl: updated.avatar_url,
      tenantId: updated.tenant_id,
      tenantName: updated.tenant.name,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, is_active: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    const currentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );
    if (!currentValid) {
      this.logger.warn(
        { userId },
        'Change password failed: invalid current password',
      );
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash },
    });

    this.logger.info({ userId }, 'User password changed');
  }

  // === Private helpers ===

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

  private verifyRefreshToken(token: string): { sub: string } {
    try {
      const secret = this.configService.get<string>('jwt.refreshSecret');
      return this.jwtService.verify<{ sub: string }>(token, { secret });
    } catch {
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }
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
