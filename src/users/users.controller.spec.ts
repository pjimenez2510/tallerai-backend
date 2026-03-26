import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUser = {
  id: 'user-001',
  name: 'Juan Pérez',
  email: 'juan@test.com',
  roleId: 'role-001',
  roleSlug: 'mecanico',
  phone: '0998765432',
  avatarUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockUser),
  findAll: jest.fn().mockResolvedValue([mockUser]),
  findOne: jest.fn().mockResolvedValue(mockUser),
  update: jest.fn().mockResolvedValue({ ...mockUser, name: 'Updated' }),
  deactivate: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
  activate: jest.fn().mockResolvedValue(mockUser),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(mockService as unknown as UsersService);
  });

  describe('POST /users', () => {
    it('should create a user and return message + data', async () => {
      const dto = {
        name: 'Juan Pérez',
        email: 'juan@test.com',
        password: 'Password123!',
        roleId: 'role-001',
      };

      const result = await controller.create(dto);

      expect(result.message).toBe('Usuario creado exitosamente');
      expect(result.data).toEqual(mockUser);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const result = await controller.findAll();

      expect(result.message).toBe('Usuarios obtenidos exitosamente');
      expect(result.data).toEqual([mockUser]);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a single user', async () => {
      const result = await controller.findOne('user-001');

      expect(result.message).toBe('Usuario obtenido exitosamente');
      expect(result.data.id).toBe('user-001');
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update and return user', async () => {
      const result = await controller.update('user-001', { name: 'Updated' });

      expect(result.message).toBe('Usuario actualizado exitosamente');
      expect(result.data.name).toBe('Updated');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should deactivate and return user', async () => {
      const result = await controller.deactivate('user-001');

      expect(result.message).toBe('Usuario desactivado exitosamente');
      expect(result.data.isActive).toBe(false);
    });
  });

  describe('PATCH /users/:id/activate', () => {
    it('should activate and return user', async () => {
      const result = await controller.activate('user-001');

      expect(result.message).toBe('Usuario reactivado exitosamente');
      expect(result.data.isActive).toBe(true);
    });
  });
});
