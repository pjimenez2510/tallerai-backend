import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { MechanicController } from './mechanic.controller';
import { MechanicService } from './mechanic.service';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [MechanicController],
  providers: [MechanicService],
})
export class MechanicModule {}
