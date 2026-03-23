import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const makeMockPrisma = () => ({
  tenant: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeMockJwt = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-uuid' }),
});

const makeMockConfig = () => ({
  get: jest.fn().mockImplementation((key: string) => {
    const values: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
    };
    return values[key];
  }),
});

const makeMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const registerDto: RegisterDto = {
  tenantName: 'Taller Test',
  tenantRuc: '0992345678001',
  adminName: 'Admin Test',
  adminEmail: 'admin@test.com',
  adminPassword: 'Password123',
  adminPhone: '0999999999',
};

const mockTenant = {
  id: 'tenant-uuid',
  name: 'Taller Test',
  ruc: '0992345678001',
  is_active: true,
};

const mockUser = {
  id: 'user-uuid',
  name: 'Admin Test',
  email: 'admin@test.com',
  role: UserRole.admin,
  tenant_id: 'tenant-uuid',
  password_hash: 'hashed-password',
  phone: '0999999999',
  avatar_url: null,
  is_active: true,
  tenant: mockTenant,
};

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let mockJwt: ReturnType<typeof makeMockJwt>;
  let mockConfig: ReturnType<typeof makeMockConfig>;
  let mockLogger: ReturnType<typeof makeMockLogger>;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    mockJwt = makeMockJwt();
    mockConfig = makeMockConfig();
    mockLogger = makeMockLogger();

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwt as unknown as JwtService,
      mockConfig as unknown as ConfigService,
      mockLogger as unknown as PinoLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
      );
      mockPrisma.tenant.create.mockResolvedValue(mockTenant);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');
    });

    it('should register a tenant and return tokens', async () => {
      const result = await service.register(registerDto);

      expect(result.user.id).toBe('user-uuid');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user.role).toBe(UserRole.admin);
      expect(result.user.tenantId).toBe('tenant-uuid');
      expect(result.tenant.id).toBe('tenant-uuid');
      expect(result.tenant.ruc).toBe('0992345678001');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
    });

    it('should create tenant and user inside a transaction', async () => {
      await service.register(registerDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: { name: registerDto.tenantName, ruc: registerDto.tenantRuc },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          tenant_id: mockTenant.id,
          name: registerDto.adminName,
          email: registerDto.adminEmail,
          password_hash: 'hashed-value',
          role: UserRole.admin,
          phone: registerDto.adminPhone,
        },
      });
    });

    it('should hash the password with bcrypt', async () => {
      await service.register(registerDto);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        registerDto.adminPassword,
        10,
      );
    });

    it('should store a hashed refresh token in the DB', async () => {
      await service.register(registerDto);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            user_id: 'user-uuid',
            token_hash: 'hashed-value',
          }),
        }),
      );
    });

    it('should log success with tenantId and userId', async () => {
      await service.register(registerDto);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { tenantId: 'tenant-uuid', userId: 'user-uuid' },
        'Tenant registered',
      );
    });

    it('should throw ConflictException when RUC already exists', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Ya existe un taller registrado con este RUC'),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Este correo electrónico ya está registrado'),
      );
    });

    it('should not check email if RUC is already taken', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'admin@test.com',
      password: 'Password123',
    };

    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
    });

    it('should return tokens and user data on valid credentials', async () => {
      const result = await service.login(loginDto);

      expect(result.user.id).toBe('user-uuid');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.tenant.id).toBe('tenant-uuid');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
    });

    it('should log successful login', async () => {
      await service.login(loginDto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: 'user-uuid', tenantId: 'tenant-uuid' },
        'Login successful',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
    });

    it('should log warning when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { email: loginDto.email },
        'Login failed: user not found',
      );
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
    });

    it('should log warning on wrong password', async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { userId: 'user-uuid', email: loginDto.email },
        'Login failed: invalid password',
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        tenant: { ...mockTenant, is_active: false },
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(
          'El taller se encuentra deshabilitado. Contacte al administrador.',
        ),
      );
    });

    it('should store a new hashed refresh token', async () => {
      await service.login(loginDto);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            user_id: 'user-uuid',
            token_hash: 'hashed-refresh',
          }),
        }),
      );
    });
  });

  describe('refresh', () => {
    const refreshDto: RefreshTokenDto = { refreshToken: 'valid-refresh-token' };
    const storedToken = {
      id: 'token-id',
      user_id: 'user-uuid',
      token_hash: 'stored-hash',
      is_revoked: false,
      expires_at: new Date(Date.now() + 86_400_000),
    };

    beforeEach(() => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid' });
      mockPrisma.refreshToken.findMany.mockResolvedValue([storedToken]);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-uuid',
        email: 'admin@test.com',
        role: UserRole.admin,
        tenant_id: 'tenant-uuid',
        is_active: true,
      });
    });

    it('should return new access and refresh tokens', async () => {
      const result = await service.refresh(refreshDto);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
    });

    it('should revoke the old refresh token', async () => {
      await service.refresh(refreshDto);

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { is_revoked: true },
      });
    });

    it('should store a new refresh token', async () => {
      await service.refresh(refreshDto);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw when no matching token found', async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        new UnauthorizedException('Token de refresco inválido'),
      );
    });

    it('should throw when token is expired', async () => {
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        { ...storedToken, expires_at: new Date(Date.now() - 1000) },
      ]);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        new UnauthorizedException('Token de refresco expirado'),
      );
    });

    it('should throw when JWT verification fails', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when user is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        new UnauthorizedException('Usuario no encontrado o inactivo'),
      );
    });
  });

  describe('logout', () => {
    const logoutDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    beforeEach(() => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid' });
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        {
          id: 'token-id',
          user_id: 'user-uuid',
          token_hash: 'stored-hash',
          is_revoked: false,
        },
      ]);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.refreshToken.update.mockResolvedValue({});
    });

    it('should revoke the matching refresh token', async () => {
      await service.logout(logoutDto);

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { is_revoked: true },
      });
    });

    it('should log the revocation', async () => {
      await service.logout(logoutDto);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: 'user-uuid' },
        'Logout: refresh token revoked',
      );
    });

    it('should not throw when token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.logout(logoutDto)).resolves.not.toThrow();
    });

    it('should not throw when no matching token found', async () => {
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.logout(logoutDto)).resolves.not.toThrow();
    });
  });

  describe('getMe', () => {
    it('should return user profile from DB', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getMe('user-uuid', 'tenant-uuid');

      expect(result.id).toBe('user-uuid');
      expect(result.name).toBe('Admin Test');
      expect(result.email).toBe('admin@test.com');
      expect(result.role).toBe(UserRole.admin);
      expect(result.tenantId).toBe('tenant-uuid');
      expect(result.tenantName).toBe('Taller Test');
      expect(result.phone).toBe('0999999999');
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getMe('user-uuid', 'tenant-uuid')).rejects.toThrow(
        new UnauthorizedException('Usuario no encontrado o inactivo'),
      );
    });

    it('should query DB with userId AND tenantId (tenant isolation)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await service.getMe('user-uuid', 'tenant-uuid');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-uuid',
          tenant_id: 'tenant-uuid',
          is_active: true,
        },
        include: { tenant: true },
      });
    });
  });
});
