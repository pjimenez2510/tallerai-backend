import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginResponse,
  MeResponse,
  RefreshResponse,
  RegisterResponse,
} from './interfaces/auth-response.interface';
import { AuthenticatedUser } from './strategies/jwt.strategy';

const mockRegisterResponse: RegisterResponse = {
  user: {
    id: 'user-uuid',
    name: 'Admin Test',
    email: 'admin@test.com',
    role: UserRole.admin,
    roleId: 'role-uuid',
    roleSlug: 'admin',
    permissions: ['dashboard.view'],
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

const mockLoginResponse: LoginResponse = {
  user: {
    id: 'user-uuid',
    name: 'Admin Test',
    email: 'admin@test.com',
    role: UserRole.admin,
    roleId: 'role-uuid',
    roleSlug: 'admin',
    permissions: ['dashboard.view'],
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

const mockRefreshResponse: RefreshResponse = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const mockMeResponse: MeResponse = {
  id: 'user-uuid',
  name: 'Admin Test',
  email: 'admin@test.com',
  role: UserRole.admin,
  roleId: 'role-uuid',
  roleName: 'Administrador',
  roleSlug: 'admin',
  permissions: ['dashboard.view'],
  phone: '0999999999',
  avatarUrl: null,
  tenantId: 'tenant-uuid',
  tenantName: 'Taller Test',
};

const registerDto: RegisterDto = {
  tenantName: 'Taller Test',
  tenantRuc: '0992345678001',
  adminName: 'Admin Test',
  adminEmail: 'admin@test.com',
  adminPassword: 'Password123',
};

const loginDto: LoginDto = {
  email: 'admin@test.com',
  password: 'Password123',
};

const refreshDto: RefreshTokenDto = {
  refreshToken: 'some-refresh-token',
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn().mockResolvedValue(mockRegisterResponse),
      login: jest.fn().mockResolvedValue(mockLoginResponse),
      refresh: jest.fn().mockResolvedValue(mockRefreshResponse),
      logout: jest.fn().mockResolvedValue(undefined),
      getMe: jest.fn().mockResolvedValue(mockMeResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(
      AuthService,
    ) as jest.Mocked<AuthService>;
  });

  describe('register', () => {
    it('should call authService.register with the dto', async () => {
      const registerSpy = jest.spyOn(authService, 'register');
      await controller.register(registerDto);
      expect(registerSpy).toHaveBeenCalledWith(registerDto);
    });

    it('should return response with correct message and data shape', async () => {
      const result = await controller.register(registerDto);

      expect(result.message).toBe(
        'Taller registrado exitosamente. Bienvenido a TallerIA.',
      );
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

  describe('login', () => {
    it('should call authService.login with the dto', async () => {
      const loginSpy = jest.spyOn(authService, 'login');
      await controller.login(loginDto);
      expect(loginSpy).toHaveBeenCalledWith(loginDto);
    });

    it('should return correct message and login data', async () => {
      const result = await controller.login(loginDto);

      expect(result.message).toBe('Inicio de sesión exitoso');
      expect(result.data.user.id).toBe('user-uuid');
      expect(result.data.accessToken).toBe('access-token');
      expect(result.data.refreshToken).toBe('refresh-token');
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with the dto', async () => {
      const refreshSpy = jest.spyOn(authService, 'refresh');
      await controller.refresh(refreshDto);
      expect(refreshSpy).toHaveBeenCalledWith(refreshDto);
    });

    it('should return new tokens', async () => {
      const result = await controller.refresh(refreshDto);

      expect(result.message).toBe('Tokens renovados exitosamente');
      expect(result.data.accessToken).toBe('new-access-token');
      expect(result.data.refreshToken).toBe('new-refresh-token');
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the dto', async () => {
      const logoutSpy = jest.spyOn(authService, 'logout');
      await controller.logout(refreshDto);
      expect(logoutSpy).toHaveBeenCalledWith(refreshDto);
    });

    it('should return success message with null data', async () => {
      const result = await controller.logout(refreshDto);

      expect(result.message).toBe('Sesión cerrada exitosamente');
      expect(result.data).toBeNull();
    });
  });

  describe('getMe', () => {
    const authenticatedUser: AuthenticatedUser = {
      id: 'user-uuid',
      tenantId: 'tenant-uuid',
      role: 'admin',
      email: 'admin@test.com',
      roleId: null,
      roleSlug: null,
      permissions: [],
    };

    it('should call authService.getMe with user id and tenantId', async () => {
      const getMeSpy = jest.spyOn(authService, 'getMe');
      await controller.getMe(authenticatedUser);
      expect(getMeSpy).toHaveBeenCalledWith('user-uuid', 'tenant-uuid');
    });

    it('should return user profile', async () => {
      const result = await controller.getMe(authenticatedUser);

      expect(result.message).toBe('Perfil obtenido exitosamente');
      expect(result.data.id).toBe('user-uuid');
      expect(result.data.tenantName).toBe('Taller Test');
    });
  });
});
