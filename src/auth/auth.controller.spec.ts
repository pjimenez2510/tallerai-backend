import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponse } from './interfaces/auth-response.interface';

const mockRegisterResponse: RegisterResponse = {
  user: {
    id: 'user-uuid',
    name: 'Admin Test',
    email: 'admin@test.com',
    role: UserRole.admin,
    tenantId: 'tenant-uuid',
  },
  tenant: {
    id: 'tenant-uuid',
    name: 'Taller Test',
    ruc: '0992345678001',
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const registerDto: RegisterDto = {
  tenantName: 'Taller Test',
  tenantRuc: '0992345678001',
  adminName: 'Admin Test',
  adminEmail: 'admin@test.com',
  adminPassword: 'Password123',
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn().mockResolvedValue(mockRegisterResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register with the dto', async () => {
      await controller.register(registerDto);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return response with correct message and data shape', async () => {
      const result = await controller.register(registerDto);

      expect(result.message).toBe('Taller registrado exitosamente. Bienvenido a TallerIA.');
      expect(result.data).toEqual(mockRegisterResponse);
    });

    it('should return user payload with tenantId (camelCase)', async () => {
      const result = await controller.register(registerDto);

      expect(result.data.user.tenantId).toBe('tenant-uuid');
      expect(result.data.user.role).toBe(UserRole.admin);
    });

    it('should include both access and refresh tokens', async () => {
      const result = await controller.register(registerDto);

      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
    });
  });
});
