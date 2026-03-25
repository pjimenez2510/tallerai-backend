import { WorkOrderStatus } from '@prisma/client';

export interface WorkOrdersByStatus {
  recepcion: number;
  diagnostico: number;
  aprobado: number;
  en_progreso: number;
  completado: number;
  entregado: number;
  cancelado: number;
}

export interface RecentWorkOrderItem {
  orderNumber: string;
  clientName: string;
  vehiclePlate: string;
  status: WorkOrderStatus;
  createdAt: string;
}

export interface TopMechanicItem {
  name: string;
  completedCount: number;
}

export interface DashboardMetrics {
  workOrders: {
    total: number;
    byStatus: WorkOrdersByStatus;
  };
  clients: {
    total: number;
    newThisMonth: number;
  };
  vehicles: {
    total: number;
  };
  inventory: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
  };
  revenue: {
    totalParts: number;
    totalLabor: number;
    total: number;
  };
  recentWorkOrders: RecentWorkOrderItem[];
  topMechanics: TopMechanicItem[];
}

export interface MonthlyTrendItem {
  month: string;
  count: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export interface ProductivityMetrics {
  avgCompletionDays: number;
  workOrdersThisMonth: number;
  workOrdersLastMonth: number;
  monthlyTrend: MonthlyTrendItem[];
  statusDistribution: StatusDistributionItem[];
}
