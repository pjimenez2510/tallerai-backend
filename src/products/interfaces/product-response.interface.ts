export interface ProductResponse {
  id: string;
  code: string;
  oemCode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  location: string | null;
  supplier: string | null;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}
