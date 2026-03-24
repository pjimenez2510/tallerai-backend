export interface PurchaseOrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrderResponse {
  id: string;
  orderNumber: string;
  supplier: string;
  notes: string | null;
  total: number;
  status: string;
  receivedAt: string | null;
  items: PurchaseOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}
