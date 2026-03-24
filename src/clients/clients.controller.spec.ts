import { DocumentType } from '@prisma/client';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

const mockClient = {
  id: 'client-001',
  documentType: DocumentType.cedula,
  documentNumber: '0912345678',
  name: 'Carlos Mendoza',
  email: 'carlos@email.com',
  phone: '0998765432',
  phoneSecondary: null,
  address: 'Av. Principal 123',
  notes: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockClient),
  findAll: jest.fn().mockResolvedValue([mockClient]),
  findOne: jest.fn().mockResolvedValue(mockClient),
  update: jest.fn().mockResolvedValue({ ...mockClient, name: 'Updated' }),
  deactivate: jest.fn().mockResolvedValue({ ...mockClient, isActive: false }),
  activate: jest.fn().mockResolvedValue(mockClient),
  search: jest.fn().mockResolvedValue([mockClient]),
};

describe('ClientsController', () => {
  let controller: ClientsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ClientsController(
      mockService as unknown as ClientsService,
    );
  });

  describe('POST /clients', () => {
    it('should create a client and return message + data', async () => {
      const dto = {
        documentType: DocumentType.cedula,
        documentNumber: '0912345678',
        name: 'Carlos Mendoza',
      };

      const result = await controller.create(dto);

      expect(result.message).toBe('Cliente registrado exitosamente');
      expect(result.data).toEqual(mockClient);
    });
  });

  describe('GET /clients', () => {
    it('should return all clients', async () => {
      const result = await controller.findAll();

      expect(result.message).toBe('Clientes obtenidos exitosamente');
      expect(result.data).toEqual([mockClient]);
    });
  });

  describe('GET /clients/search', () => {
    it('should search clients', async () => {
      const result = await controller.search('Carlos');

      expect(result.message).toBe('Búsqueda completada');
      expect(result.data).toEqual([mockClient]);
      expect(mockService.search).toHaveBeenCalledWith('Carlos');
    });
  });

  describe('GET /clients/:id', () => {
    it('should return a single client', async () => {
      const result = await controller.findOne('client-001');

      expect(result.message).toBe('Cliente obtenido exitosamente');
      expect(result.data.id).toBe('client-001');
    });
  });

  describe('PATCH /clients/:id', () => {
    it('should update and return client', async () => {
      const result = await controller.update('client-001', {
        name: 'Updated',
      });

      expect(result.message).toBe('Cliente actualizado exitosamente');
      expect(result.data.name).toBe('Updated');
    });
  });

  describe('DELETE /clients/:id', () => {
    it('should deactivate client', async () => {
      const result = await controller.deactivate('client-001');

      expect(result.message).toBe('Cliente desactivado exitosamente');
      expect(result.data.isActive).toBe(false);
    });
  });

  describe('PATCH /clients/:id/activate', () => {
    it('should activate client', async () => {
      const result = await controller.activate('client-001');

      expect(result.message).toBe('Cliente reactivado exitosamente');
      expect(result.data.isActive).toBe(true);
    });
  });
});
