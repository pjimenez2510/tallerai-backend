export interface BusinessSettings {
  currency?: string;
  taxRate?: number;
  defaultPaymentTerms?: string;
  workingHours?: string;
}

export interface TenantSettingsResponse {
  id: string;
  name: string;
  ruc: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  settings: BusinessSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
