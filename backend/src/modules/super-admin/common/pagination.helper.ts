export interface PaginationParams {
  page?: string | number;
  limit?: string | number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  summary?: any;
}

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export const ALLOWED_PAGE_SIZES = [10, 25, 50, 100, 200];
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Parses and bounds page and limit query parameters for Prisma database queries.
 */
export function parsePagination(
  page?: string | number,
  limit?: string | number,
  defaultLimit = DEFAULT_PAGE_SIZE,
): ParsedPagination {
  const parsedPage = Math.max(1, parseInt(String(page || 1), 10) || 1);
  let parsedLimit = parseInt(String(limit || defaultLimit), 10) || defaultLimit;
  if (parsedLimit <= 0) parsedLimit = defaultLimit;
  if (parsedLimit > 200) parsedLimit = 200;

  const skip = (parsedPage - 1) * parsedLimit;
  const take = parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip,
    take,
  };
}

/**
 * Formats data array and total record count into a standardized PaginatedResult object.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  summary?: any,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    summary,
  };
}
