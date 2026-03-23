import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
