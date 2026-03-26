export interface UserResponse {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleSlug: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
