import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
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
  },
  $transaction: jest.fn(),
});

const makeMockJwt = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
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
};

const mockUser = {
  id: 'user-uuid',
  name: 'Admin Test',
  email: 'admin@test.com',
  role: UserRole.admin,
  tenant_id: 'tenant-uuid',
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
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
        fn(mockPrisma),
      );
      mockPrisma.tenant.create.mockResolvedValue(mockTenant);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockBcrypt.hash.mockImplementation(() => Promise.resolve('hashed-value'));
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
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registerDto.adminPassword, 10);
    });

    it('should store a hashed refresh token in the DB', async () => {
      await service.register(registerDto);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
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

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });
});
