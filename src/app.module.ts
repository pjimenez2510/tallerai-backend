import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProductsModule } from './products/products.module';
import { PublicModule } from './public/public.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { PurchasesModule } from './purchases/purchases.module';
import { MechanicModule } from './mechanic/mechanic.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { TenantModule } from './common/tenant/tenant.module';
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
      forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
    }),
    TenantModule,
    PrismaModule,
    AuthModule,
    ClientsModule,
    ProductsModule,
    ServicesModule,
    UsersModule,
    VehiclesModule,
    WorkOrdersModule,
    PurchasesModule,
    PublicModule,
    DashboardModule,
    MechanicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
