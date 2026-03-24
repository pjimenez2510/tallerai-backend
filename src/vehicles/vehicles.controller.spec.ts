import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

const mockVehicle = {
  id: 'vehicle-001',
  clientId: 'client-001',
  clientName: 'Carlos Mendoza',
  plate: 'GYE-1234',
  brand: 'Toyota',
  model: 'Hilux',
  year: 2024,
  color: 'Blanco',
  vin: null,
  engine: '2.4L Diesel',
  transmission: 'Manual',
  fuelType: 'Diesel',
  mileage: 45000,
  notes: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockVehicle),
  findAll: jest.fn().mockResolvedValue([mockVehicle]),
  findByClient: jest.fn().mockResolvedValue([mockVehicle]),
  findOne: jest.fn().mockResolvedValue(mockVehicle),
  findByPlate: jest.fn().mockResolvedValue(mockVehicle),
  update: jest.fn().mockResolvedValue({ ...mockVehicle, mileage: 50000 }),
  deactivate: jest.fn().mockResolvedValue({ ...mockVehicle, isActive: false }),
  search: jest.fn().mockResolvedValue([mockVehicle]),
};

describe('VehiclesController', () => {
  let controller: VehiclesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VehiclesController(
      mockService as unknown as VehiclesService,
    );
  });

  describe('POST /vehicles', () => {
    it('should create a vehicle', async () => {
      const result = await controller.create({
        clientId: 'client-001',
        plate: 'GYE-1234',
        brand: 'Toyota',
        model: 'Hilux',
        year: 2024,
      });

      expect(result.message).toBe('Vehículo registrado exitosamente');
      expect(result.data).toEqual(mockVehicle);
    });
  });

  describe('GET /vehicles', () => {
    it('should return all vehicles', async () => {
      const result = await controller.findAll();

      expect(result.message).toBe('Vehículos obtenidos exitosamente');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /vehicles/search', () => {
    it('should search vehicles', async () => {
      const result = await controller.search('Toyota');

      expect(result.message).toBe('Búsqueda completada');
      expect(mockService.search).toHaveBeenCalledWith('Toyota');
    });
  });

  describe('GET /vehicles/by-plate/:plate', () => {
    it('should find vehicle by plate', async () => {
      const result = await controller.findByPlate('GYE-1234');

      expect(result.message).toBe('Vehículo obtenido exitosamente');
      expect(mockService.findByPlate).toHaveBeenCalledWith('GYE-1234');
    });
  });

  describe('GET /vehicles/by-client/:clientId', () => {
    it('should return vehicles by client', async () => {
      const result = await controller.findByClient('client-001');

      expect(result.message).toBe(
        'Vehículos del cliente obtenidos exitosamente',
      );
      expect(mockService.findByClient).toHaveBeenCalledWith('client-001');
    });
  });

  describe('GET /vehicles/:id', () => {
    it('should return a vehicle by id', async () => {
      const result = await controller.findOne('vehicle-001');

      expect(result.message).toBe('Vehículo obtenido exitosamente');
    });
  });

  describe('PATCH /vehicles/:id', () => {
    it('should update a vehicle', async () => {
      const result = await controller.update('vehicle-001', { mileage: 50000 });

      expect(result.message).toBe('Vehículo actualizado exitosamente');
      expect(result.data.mileage).toBe(50000);
    });
  });

  describe('DELETE /vehicles/:id', () => {
    it('should deactivate a vehicle', async () => {
      const result = await controller.deactivate('vehicle-001');

      expect(result.message).toBe('Vehículo desactivado exitosamente');
      expect(result.data.isActive).toBe(false);
    });
  });
});
