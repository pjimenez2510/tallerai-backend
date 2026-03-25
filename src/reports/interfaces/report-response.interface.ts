export interface ReportData {
  headers: string[];
  rows: string[][];
}

export interface WorkOrderReportSummary {
  total: number;
  completed: number;
  avgDays: number;
  revenue: number;
}

export interface WorkOrderReportResponse extends ReportData {
  summary: WorkOrderReportSummary;
}

export interface InventoryReportSummary {
  totalProducts: number;
  totalValue: number;
  lowStock: number;
}

export interface InventoryReportResponse extends ReportData {
  summary: InventoryReportSummary;
}

export interface ClientsReportSummary {
  total: number;
  withEmail: number;
  withPhone: number;
}

export interface ClientsReportResponse extends ReportData {
  summary: ClientsReportSummary;
}
