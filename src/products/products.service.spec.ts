import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { ProductsService } from './products.service';

const mockPrisma = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const TENANT_ID = 'tenant-001';

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue(TENANT_ID),
};

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'product-001',
    tenant_id: TENANT_ID,
    code: 'REP-001',
    oem_code: '90915-YZZD1',
    name: 'Filtro de aceite Toyota',
    description: 'Filtro original',
    brand: 'Toyota',
    category: 'Filtros',
    unit: 'unidad',
    cost_price: { toNumber: () => 8.5 },
    sale_price: { toNumber: () => 15.0 },
    stock: 50,
    min_stock: 5,
    location: 'Estante A-3',
    supplier: 'Repuestos Ecuador',
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(
      mockPrisma as unknown as PrismaService,
      mockTenantContext as unknown as TenantContext,
      mockLogger as never,
    );
  });

  describe('create', () => {
    const dto = {
      code: 'REP-001',
      oemCode: '90915-YZZD1',
      name: 'Filtro de aceite Toyota',
      costPrice: 8.5,
      salePrice: 15.0,
      stock: 50,
      minStock: 5,
    };

    it('should create a product successfully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue(makeProduct());

      const result = await service.create(dto);

      expect(result.id).toBe('product-001');
      expect(result.code).toBe('REP-001');
      expect(result.name).toBe('Filtro de aceite Toyota');
    });

    it('should throw ConflictException if code exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should uppercase the code', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue(makeProduct());

      await service.create({ ...dto, code: 'rep-001' });

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'REP-001' }) as unknown,
        }),
      );
    });

    it('should compute isLowStock correctly', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue(
        makeProduct({ stock: 3, min_stock: 5 }),
      );

      const result = await service.create(dto);

      expect(result.isLowStock).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all active products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID, is_active: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());

      const result = await service.findOne('product-001');

      expect(result.id).toBe('product-001');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.product.update.mockResolvedValue(
        makeProduct({ name: 'Updated' }),
      );

      const result = await service.update('product-001', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check code uniqueness when changing code', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce(makeProduct())
        .mockResolvedValueOnce(makeProduct({ id: 'other' }));

      await expect(
        service.update('product-001', { code: 'NEW-CODE' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.product.update.mockResolvedValue(
        makeProduct({ is_active: false }),
      );

      const result = await service.deactivate('product-001');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should search products by query', async () => {
      mockPrisma.product.findMany.mockResolvedValue([makeProduct()]);

      const result = await service.search('filtro');

      expect(result).toHaveLength(1);
    });
  });

  describe('getLowStock', () => {
    it('should return products with stock below minimum', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct({ stock: 3, min_stock: 5 }),
        makeProduct({ id: 'product-002', stock: 50, min_stock: 5 }),
      ]);

      const result = await service.getLowStock();

      expect(result).toHaveLength(1);
      expect(result[0].isLowStock).toBe(true);
    });

    it('should exclude products with min_stock = 0', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct({ stock: 0, min_stock: 0 }),
      ]);

      const result = await service.getLowStock();

      expect(result).toHaveLength(0);
    });
  });
});
