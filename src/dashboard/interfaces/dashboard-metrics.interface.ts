export interface WorkOrdersByStatus {
  recepcion: number;
  diagnostico: number;
  aprobado: number;
  en_progreso: number;
  completado: number;
  entregado: number;
  cancelado: number;
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
}
