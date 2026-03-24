import { DocumentType } from '@prisma/client';

export interface ClientResponse {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
