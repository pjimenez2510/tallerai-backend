import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';

const mockWorkOrder = {
  id: 'wo-001',
  orderNumber: 'OT-2026-0001',
  clientId: 'client-001',
  clientName: 'Carlos Mendoza',
  vehicleId: 'vehicle-001',
  vehiclePlate: 'GYE-1234',
  vehicleDescription: 'Toyota Hilux (2024)',
  assignedTo: null,
  mechanicName: null,
  status: WorkOrderStatus.recepcion,
  priority: WorkOrderPriority.normal,
  description: 'Cambio de aceite',
  diagnosis: null,
  internalNotes: null,
  mileageIn: 45000,
  estimatedDate: null,
  completedDate: null,
  deliveredDate: null,
  totalParts: 0,
  totalLabor: 0,
  total: 0,
  tasks: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockWorkOrder),
  findAll: jest.fn().mockResolvedValue([mockWorkOrder]),
  findOne: jest.fn().mockResolvedValue(mockWorkOrder),
  update: jest.fn().mockResolvedValue({
    ...mockWorkOrder,
    status: WorkOrderStatus.diagnostico,
  }),
};

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WorkOrdersController(
      mockService as unknown as WorkOrdersService,
    );
  });

  describe('POST /work-orders', () => {
    it('should create a work order', async () => {
      const result = await controller.create({
        clientId: 'client-001',
        vehicleId: 'vehicle-001',
        description: 'Cambio de aceite',
      });

      expect(result.message).toBe('Orden de trabajo creada exitosamente');
      expect(result.data).toEqual(mockWorkOrder);
    });
  });

  describe('GET /work-orders', () => {
    it('should return all work orders', async () => {
      const result = await controller.findAll();

      expect(result.message).toBe('Órdenes de trabajo obtenidas exitosamente');
      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      await controller.findAll(WorkOrderStatus.recepcion);

      expect(mockService.findAll).toHaveBeenCalledWith(
        WorkOrderStatus.recepcion,
      );
    });
  });

  describe('GET /work-orders/:id', () => {
    it('should return a work order', async () => {
      const result = await controller.findOne('wo-001');

      expect(result.message).toBe('Orden de trabajo obtenida exitosamente');
    });
  });

  describe('PATCH /work-orders/:id', () => {
    it('should update a work order', async () => {
      const result = await controller.update('wo-001', {
        status: WorkOrderStatus.diagnostico,
      });

      expect(result.message).toBe('Orden de trabajo actualizada exitosamente');
    });
  });
});
