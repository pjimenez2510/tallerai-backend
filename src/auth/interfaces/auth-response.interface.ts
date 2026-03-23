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

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}
