export interface ServiceResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
