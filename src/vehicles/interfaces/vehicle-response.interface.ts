export interface VehicleResponse {
  id: string;
  clientId: string;
  clientName: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  vin: string | null;
  engine: string | null;
  transmission: string | null;
  fuelType: string | null;
  mileage: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
