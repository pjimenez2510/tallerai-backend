import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../common/tenant/tenant.module';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
