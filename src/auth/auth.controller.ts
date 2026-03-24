import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginResponse,
  MeResponse,
  RefreshResponse,
  RegisterResponse,
} from './interfaces/auth-response.interface';
import { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({
    summary: 'Register a new workshop (creates Tenant + admin User)',
  })
  @ApiResponse({ status: 201, description: 'Tenant registered successfully' })
  @ApiResponse({ status: 409, description: 'RUC or email already registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ message: string; data: RegisterResponse }> {
    const data = await this.authService.register(dto);
    return {
      message: 'Taller registrado exitosamente. Bienvenido a TallerIA.',
      data,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ message: string; data: LoginResponse }> {
    const data = await this.authService.login(dto);
    return { message: 'Inicio de sesión exitoso', data };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string; data: RefreshResponse }> {
    const data = await this.authService.refresh(dto);
    return { message: 'Tokens renovados exitosamente', data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string; data: null }> {
    await this.authService.logout(dto);
    return { message: 'Sesión cerrada exitosamente', data: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile (always queries DB)' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string; data: MeResponse }> {
    const data = await this.authService.getMe(user.id, user.tenantId);
    return { message: 'Perfil obtenido exitosamente', data };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update own profile (name, phone, avatar_url)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ message: string; data: MeResponse }> {
    const data = await this.authService.updateProfile(
      user.id,
      user.tenantId,
      dto,
    );
    return { message: 'Perfil actualizado exitosamente', data };
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string; data: null }> {
    await this.authService.changePassword(user.id, dto);
    return { message: 'Contraseña cambiada exitosamente', data: null };
  }
}
