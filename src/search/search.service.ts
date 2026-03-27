import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { GlobalSearchResult } from './interfaces/search-result.interface';

const SEARCH_LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(SearchService.name)
    private readonly logger: PinoLogger,
  ) {}

  async globalSearch(query: string): Promise<GlobalSearchResult> {
    const tenantId = this.tenantContext.getTenantId();
    const term = query.trim();

    this.logger.info({ tenantId, query: term }, 'Global search executed');

    const [clients, vehicles, workOrders, products] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { document_number: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, document_number: true },
        take: SEARCH_LIMIT,
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          OR: [
            { plate: { contains: term.toUpperCase(), mode: 'insensitive' } },
            { brand: { contains: term, mode: 'insensitive' } },
            { model: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          client: { select: { name: true } },
        },
        take: SEARCH_LIMIT,
        orderBy: { plate: 'asc' },
      }),
      this.prisma.workOrder.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { order_number: { contains: term, mode: 'insensitive' } },
            { client: { name: { contains: term, mode: 'insensitive' } } },
            {
              vehicle: {
                plate: { contains: term.toUpperCase(), mode: 'insensitive' },
              },
            },
          ],
        },
        select: {
          id: true,
          order_number: true,
          status: true,
          client: { select: { name: true } },
          vehicle: { select: { plate: true } },
        },
        take: SEARCH_LIMIT,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.product.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          OR: [
            { code: { contains: term.toUpperCase(), mode: 'insensitive' } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, code: true, name: true },
        take: SEARCH_LIMIT,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        documentNumber: c.document_number,
      })),
      vehicles: vehicles.map((v) => ({
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        clientName: v.client.name,
      })),
      workOrders: workOrders.map((wo) => ({
        id: wo.id,
        orderNumber: wo.order_number,
        clientName: wo.client.name,
        vehiclePlate: wo.vehicle.plate,
        status: wo.status,
      })),
      products: products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
      })),
    };
  }
}
