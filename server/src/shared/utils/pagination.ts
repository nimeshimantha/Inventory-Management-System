export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function getPagination(params: { page?: unknown; limit?: unknown }): PaginationResult {
  const page = Math.max(1, parseInt(String(params.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || '10'), 10) || 10));
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}
