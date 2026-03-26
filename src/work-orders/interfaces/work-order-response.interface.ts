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

export interface AttachmentMetaResponse {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  description: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface AttachmentFullResponse extends AttachmentMetaResponse {
  data: string;
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
  parentId: string | null;
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
  supplements: SupplementSummary[];
  clientSignature: string | null;
  signatureDate: string | null;
  damageMap: unknown;
  damageNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplementSummary {
  id: string;
  orderNumber: string;
  status: WorkOrderStatus;
  createdAt: string;
}

export interface VehicleTimelineEntry {
  id: string;
  orderNumber: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  description: string;
  mechanicName: string | null;
  mileageIn: number | null;
  totalParts: number;
  totalLabor: number;
  total: number;
  tasksCount: number;
  partsCount: number;
  completedDate: string | null;
  createdAt: string;
}
