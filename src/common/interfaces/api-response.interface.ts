export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
