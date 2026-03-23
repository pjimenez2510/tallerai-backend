import { UserRole } from '@prisma/client';

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export interface AuthTenantPayload {
  id: string;
  name: string;
  ruc: string;
}

export interface RegisterResponse {
  user: AuthUserPayload;
  tenant: AuthTenantPayload;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUserPayload;
  tenant: AuthTenantPayload;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  tenantId: string;
  tenantName: string;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}
