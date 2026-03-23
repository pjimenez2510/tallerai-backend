export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tenantId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}
