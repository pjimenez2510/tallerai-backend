import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
