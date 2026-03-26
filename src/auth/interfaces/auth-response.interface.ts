export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleSlug: string | null;
  permissions: string[];
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
  roleId: string | null;
  roleName: string | null;
  roleSlug: string | null;
  permissions: string[];
  phone: string | null;
  avatarUrl: string | null;
  tenantId: string;
  tenantName: string;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  roleSlug: string | null;
  email: string;
  roleId?: string | null;
}
