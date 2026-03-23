import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(
    ',',
  ),
  apiPrefix: process.env['API_PREFIX'] ?? 'api/v1',
}));

export type AppConfig = ReturnType<typeof appConfig>;
