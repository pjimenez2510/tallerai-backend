import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export interface WorkOrderPartResponse {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
}

export interface WorkOrderTaskResponse {
  id: string;
  description: string;
  isCompleted: boolean;
  laborHours: number;
  laborCost: number;
  sortOrder: number;
}

export interface WorkOrderResponse {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleDescription: string;
  assignedTo: string | null;
  mechanicName: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description: string;
  diagnosis: string | null;
  internalNotes: string | null;
  mileageIn: number | null;
  estimatedDate: string | null;
  completedDate: string | null;
  deliveredDate: string | null;
  totalParts: number;
  totalLabor: number;
  total: number;
  tasks: WorkOrderTaskResponse[];
  parts: WorkOrderPartResponse[];
  createdAt: string;
  updatedAt: string;
}
