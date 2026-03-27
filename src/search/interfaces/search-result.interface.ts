export interface ClientSearchResult {
  id: string;
  name: string;
  documentNumber: string;
}

export interface VehicleSearchResult {
  id: string;
  plate: string;
  brand: string;
  model: string;
  clientName: string;
}

export interface WorkOrderSearchResult {
  id: string;
  orderNumber: string;
  clientName: string;
  vehiclePlate: string;
  status: string;
}

export interface ProductSearchResult {
  id: string;
  code: string;
  name: string;
}

export interface GlobalSearchResult {
  clients: ClientSearchResult[];
  vehicles: VehicleSearchResult[];
  workOrders: WorkOrderSearchResult[];
  products: ProductSearchResult[];
}
