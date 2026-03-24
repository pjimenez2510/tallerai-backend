import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse } from './interfaces/product-response.interface';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(ProductsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertCodeNotTaken(dto.code, tenantId);

    const product = await this.prisma.product.create({
      data: {
        tenant_id: tenantId,
        code: dto.code.toUpperCase(),
        oem_code: dto.oemCode,
        name: dto.name,
        description: dto.description,
        brand: dto.brand,
        category: dto.category,
        unit: dto.unit ?? 'unidad',
        cost_price: dto.costPrice,
        sale_price: dto.salePrice,
        stock: dto.stock ?? 0,
        min_stock: dto.minStock ?? 0,
        location: dto.location,
        supplier: dto.supplier,
      },
    });

    this.logger.info(
      { productId: product.id, tenantId, code: product.code },
      'Product created',
    );

    return this.mapProduct(product);
  }

  async findAll(): Promise<ProductResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const products = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => this.mapProduct(p));
  }

  async findOne(id: string): Promise<ProductResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const product = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.mapProduct(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (dto.code && dto.code.toUpperCase() !== existing.code) {
      await this.assertCodeNotTaken(dto.code, tenantId);
    }

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.oemCode !== undefined) data.oem_code = dto.oemCode;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.costPrice !== undefined) data.cost_price = dto.costPrice;
    if (dto.salePrice !== undefined) data.sale_price = dto.salePrice;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.minStock !== undefined) data.min_stock = dto.minStock;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.supplier !== undefined) data.supplier = dto.supplier;

    const product = await this.prisma.product.update({
      where: { id },
      data,
    });

    this.logger.info({ productId: id, tenantId }, 'Product updated');

    return this.mapProduct(product);
  }

  async deactivate(id: string): Promise<ProductResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });

    this.logger.info({ productId: id, tenantId }, 'Product deactivated');

    return this.mapProduct(product);
  }

  async search(query: string): Promise<ProductResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const products = await this.prisma.product.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        OR: [
          { code: { contains: query.toUpperCase(), mode: 'insensitive' } },
          { oem_code: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 30,
    });

    return products.map((p) => this.mapProduct(p));
  }

  async getLowStock(): Promise<ProductResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    // Prisma doesn't support field-to-field comparison,
    // so we filter in application layer
    const allActive = await this.prisma.product.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { stock: 'asc' },
    });

    const lowStock = allActive.filter(
      (p) => p.min_stock > 0 && p.stock <= p.min_stock,
    );

    return lowStock.map((p) => this.mapProduct(p));
  }

  private async assertCodeNotTaken(
    code: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { code: code.toUpperCase(), tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un producto con este código en el taller',
      );
    }
  }

  private mapProduct(product: {
    id: string;
    code: string;
    oem_code: string | null;
    name: string;
    description: string | null;
    brand: string | null;
    category: string | null;
    unit: string;
    cost_price: Prisma.Decimal;
    sale_price: Prisma.Decimal;
    stock: number;
    min_stock: number;
    location: string | null;
    supplier: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): ProductResponse {
    return {
      id: product.id,
      code: product.code,
      oemCode: product.oem_code,
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      unit: product.unit,
      costPrice: Number(product.cost_price),
      salePrice: Number(product.sale_price),
      stock: product.stock,
      minStock: product.min_stock,
      location: product.location,
      supplier: product.supplier,
      isActive: product.is_active,
      isLowStock: product.min_stock > 0 && product.stock <= product.min_stock,
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
    };
  }
}
