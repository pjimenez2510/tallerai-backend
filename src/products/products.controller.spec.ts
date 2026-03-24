import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

const mockProduct = {
  id: 'product-001',
  code: 'REP-001',
  oemCode: '90915-YZZD1',
  name: 'Filtro de aceite Toyota',
  description: 'Filtro original',
  brand: 'Toyota',
  category: 'Filtros',
  unit: 'unidad',
  costPrice: 8.5,
  salePrice: 15.0,
  stock: 50,
  minStock: 5,
  location: 'Estante A-3',
  supplier: 'Repuestos Ecuador',
  isActive: true,
  isLowStock: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockProduct),
  findAll: jest.fn().mockResolvedValue([mockProduct]),
  findOne: jest.fn().mockResolvedValue(mockProduct),
  update: jest.fn().mockResolvedValue({ ...mockProduct, name: 'Updated' }),
  deactivate: jest.fn().mockResolvedValue({ ...mockProduct, isActive: false }),
  search: jest.fn().mockResolvedValue([mockProduct]),
  getLowStock: jest
    .fn()
    .mockResolvedValue([{ ...mockProduct, stock: 2, isLowStock: true }]),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProductsController(
      mockService as unknown as ProductsService,
    );
  });

  describe('POST /products', () => {
    it('should create a product', async () => {
      const result = await controller.create({
        code: 'REP-001',
        name: 'Filtro',
        costPrice: 8.5,
        salePrice: 15.0,
      });

      expect(result.message).toBe('Producto creado exitosamente');
      expect(result.data).toEqual(mockProduct);
    });
  });

  describe('GET /products', () => {
    it('should return all products', async () => {
      const result = await controller.findAll();

      expect(result.message).toBe('Productos obtenidos exitosamente');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /products/search', () => {
    it('should search products', async () => {
      const result = await controller.search('filtro');

      expect(result.message).toBe('Búsqueda completada');
    });
  });

  describe('GET /products/low-stock', () => {
    it('should return low stock products', async () => {
      const result = await controller.getLowStock();

      expect(result.message).toBe('Productos con stock bajo');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product', async () => {
      const result = await controller.findOne('product-001');

      expect(result.message).toBe('Producto obtenido exitosamente');
    });
  });

  describe('PATCH /products/:id', () => {
    it('should update a product', async () => {
      const result = await controller.update('product-001', {
        name: 'Updated',
      });

      expect(result.message).toBe('Producto actualizado exitosamente');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should deactivate a product', async () => {
      const result = await controller.deactivate('product-001');

      expect(result.message).toBe('Producto desactivado exitosamente');
      expect(result.data.isActive).toBe(false);
    });
  });
});
