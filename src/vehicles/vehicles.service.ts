import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant.context';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponse } from './interfaces/vehicle-response.interface';
import {
  PaginationDto,
  buildPaginatedResponse,
} from '../common/dto/pagination.dto';
import { PaginatedData } from '../common/interfaces/api-response.interface';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    @InjectPinoLogger(VehiclesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(dto: CreateVehicleDto): Promise<VehicleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    await this.assertClientExists(dto.clientId, tenantId);
    await this.assertPlateNotTaken(dto.plate, tenantId);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        tenant_id: tenantId,
        client_id: dto.clientId,
        plate: dto.plate.toUpperCase(),
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        color: dto.color,
        vin: dto.vin,
        engine: dto.engine,
        transmission: dto.transmission,
        fuel_type: dto.fuelType,
        mileage: dto.mileage ?? 0,
        notes: dto.notes,
      },
      include: { client: true },
    });

    this.logger.info(
      { vehicleId: vehicle.id, tenantId, plate: vehicle.plate },
      'Vehicle created',
    );

    return this.mapVehicle(vehicle);
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<PaginatedData<VehicleResponse>> {
    const tenantId = this.tenantContext.getTenantId();

    const where = { tenant_id: tenantId, is_active: true };

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        include: { client: true },
        orderBy: { created_at: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return buildPaginatedResponse(
      vehicles.map((v) => this.mapVehicle(v)),
      total,
      pagination,
    );
  }

  async findByClient(clientId: string): Promise<VehicleResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const vehicles = await this.prisma.vehicle.findMany({
      where: { tenant_id: tenantId, client_id: clientId, is_active: true },
      include: { client: true },
      orderBy: { created_at: 'desc' },
    });

    return vehicles.map((v) => this.mapVehicle(v));
  }

  async findOne(id: string): Promise<VehicleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenant_id: tenantId },
      include: { client: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return this.mapVehicle(vehicle);
  }

  async findByPlate(plate: string): Promise<VehicleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { tenant_id: tenantId, plate: plate.toUpperCase() },
      include: { client: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return this.mapVehicle(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.vehicle.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    if (dto.clientId && dto.clientId !== existing.client_id) {
      await this.assertClientExists(dto.clientId, tenantId);
    }

    if (dto.plate && dto.plate.toUpperCase() !== existing.plate) {
      await this.assertPlateNotTaken(dto.plate, tenantId);
    }

    const data: Record<string, unknown> = {};
    if (dto.clientId !== undefined) data.client_id = dto.clientId;
    if (dto.plate !== undefined) data.plate = dto.plate.toUpperCase();
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.vin !== undefined) data.vin = dto.vin;
    if (dto.engine !== undefined) data.engine = dto.engine;
    if (dto.transmission !== undefined) data.transmission = dto.transmission;
    if (dto.fuelType !== undefined) data.fuel_type = dto.fuelType;
    if (dto.mileage !== undefined) data.mileage = dto.mileage;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data,
      include: { client: true },
    });

    this.logger.info({ vehicleId: id, tenantId }, 'Vehicle updated');

    return this.mapVehicle(vehicle);
  }

  async deactivate(id: string): Promise<VehicleResponse> {
    const tenantId = this.tenantContext.getTenantId();

    const existing = await this.prisma.vehicle.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: { is_active: false },
      include: { client: true },
    });

    this.logger.info({ vehicleId: id, tenantId }, 'Vehicle deactivated');

    return this.mapVehicle(vehicle);
  }

  async search(query: string): Promise<VehicleResponse[]> {
    const tenantId = this.tenantContext.getTenantId();

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true,
        OR: [
          { plate: { contains: query.toUpperCase(), mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { client: true },
      orderBy: { plate: 'asc' },
      take: 20,
    });

    return vehicles.map((v) => this.mapVehicle(v));
  }

  private async assertClientExists(
    clientId: string,
    tenantId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenant_id: tenantId, is_active: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado o inactivo');
    }
  }

  private async assertPlateNotTaken(
    plate: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.prisma.vehicle.findFirst({
      where: { plate: plate.toUpperCase(), tenant_id: tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un vehículo con esta placa en el taller',
      );
    }
  }

  private mapVehicle(vehicle: {
    id: string;
    client_id: string;
    client: { name: string };
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string | null;
    vin: string | null;
    engine: string | null;
    transmission: string | null;
    fuel_type: string | null;
    mileage: number;
    notes: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): VehicleResponse {
    return {
      id: vehicle.id,
      clientId: vehicle.client_id,
      clientName: vehicle.client.name,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      vin: vehicle.vin,
      engine: vehicle.engine,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuel_type,
      mileage: vehicle.mileage,
      notes: vehicle.notes,
      isActive: vehicle.is_active,
      createdAt: vehicle.created_at.toISOString(),
      updatedAt: vehicle.updated_at.toISOString(),
    };
  }
}
