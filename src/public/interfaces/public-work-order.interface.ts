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
