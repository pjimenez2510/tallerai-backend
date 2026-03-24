import { WorkOrderStatus } from '@prisma/client';

export interface MechanicTaskItem {
  id: string;
  description: string;
  isCompleted: boolean;
  laborHours: number;
  laborCost: number;
  sortOrder: number;
}

export interface MechanicWorkOrderItem {
  id: string;
  orderNumber: string;
  clientName: string;
  vehiclePlate: string;
  vehicleDescription: string;
  status: WorkOrderStatus;
  description: string;
  priority: string;
  tasks: MechanicTaskItem[];
  createdAt: string;
}

export interface MechanicSummary {
  assignedCount: number;
  completedToday: number;
  pendingTasks: number;
}
