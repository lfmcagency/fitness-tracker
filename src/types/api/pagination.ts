import { ApiResponse } from './common';

/**
 * Standard pagination parameters for list requests
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Field to sort by */
  sort?: string;
  /** Sort direction */
  order?: 'asc' | 'desc';
}

/**
 * Pagination information returned in list responses
 */
export interface PaginationInfo {
  /** Total number of items across all pages */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  pages: number;
}

/**
 * Standard response format for paginated lists
 * @template T The type of items in the list
 */
export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: PaginationInfo;
}> {}