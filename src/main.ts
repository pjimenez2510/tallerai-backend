import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Pino logger
  app.useLogger(app.get(Logger));

  // Helmet — FIRST middleware (security headers)
  app.use(helmet());

  // Config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3001;
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? ['http://localhost:3000'];
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';

  // CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — only in non-production environments
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TallerIA API')
      .setDescription('Sistema de Gestión de Órdenes de Trabajo para Talleres Mecánicos')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('clients', 'Client management')
      .addTag('vehicles', 'Vehicle management')
      .addTag('work-orders', 'Work order management')
      .addTag('inventory', 'Inventory management')
      .addTag('kanban', 'Kanban board')
      .addTag('notifications', 'Notification system')
      .addTag('billing', 'Billing and invoicing')
      .addTag('reports', 'Reports and analytics')
      .addTag('admin', 'Admin panel')
      .addTag('ai', 'AI diagnostic features')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
