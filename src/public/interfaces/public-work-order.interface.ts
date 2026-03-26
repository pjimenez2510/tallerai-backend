export interface PublicWorkOrderResponse {
  orderNumber: string;
  status: string;
  statusLabel: string;
  priority: string;
  vehiclePlate: string;
  vehicleDescription: string;
  description: string;
  createdAt: string;
  estimatedDate: string | null;
  completedDate: string | null;
  deliveredDate: string | null;
  tenantName: string;
}

export interface PublicWorkOrderSummary {
  orderNumber: string;
  status: string;
  statusLabel: string;
  description: string;
  createdAt: string;
  completedDate: string | null;
  deliveredDate: string | null;
}

export interface PublicVehiclePortalResponse {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  tenantName: string;
  workOrders: PublicWorkOrderSummary[];
}
