export interface QuoteTaskItem {
  id: string;
  description: string;
  laborCost: number;
}

export interface QuotePartItem {
  id: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteResponse {
  orderNumber: string;
  date: string;
  tenantName: string;
  tenantRuc: string;
  tenantPhone: string | null;
  tenantAddress: string | null;
  clientName: string;
  clientDocument: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string | null;
  mileageIn: number | null;
  description: string;
  tasks: QuoteTaskItem[];
  parts: QuotePartItem[];
  subtotalParts: number;
  subtotalLabor: number;
  subtotal: number;
  iva: number;
  total: number;
}
