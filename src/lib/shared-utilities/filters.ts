// Search, filter, and pagination patterns (eliminates 4x duplication across stores)

/**
 * Standard pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Pagination metadata returned from APIs
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Standard search parameters
 */
export interface SearchParams {
  query?: string;
  category?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Combined filter parameters
 */
export interface FilterParams extends SearchParams, PaginationParams {}

/**
 * Filter result with metadata
 */
export interface FilterResult<T> {
  items: T[];
  pagination: PaginationMeta;
  totalFiltered: number;
  appliedFilters: Record<string, any>;
}

/**
 * Create default pagination parameters
 */
export function createPaginationParams(page: number = 1, limit: number = 20): PaginationParams {
  return {
    page: Math.max(1, page),
    limit: Math.max(1, Math.min(limit, 100)), // Cap at 100 items
    offset: (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100))
  };
}

/**
 * Create pagination metadata from results
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

/**
 * Text search utility - handles multiple search strategies
 */
export function searchText(
  text: string,
  query: string,
  options: {
    caseSensitive?: boolean;
    wholeWords?: boolean;
    fuzzy?: boolean;
  } = {}
): boolean {
  if (!query || query.trim() === '') {
    return true; // Empty query matches everything
  }

  const {
    caseSensitive = false,
    wholeWords = false,
    fuzzy = false
  } = options;

  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  if (wholeWords) {
    const wordBoundaryRegex = new RegExp(`\\b${searchQuery}\\b`, caseSensitive ? 'g' : 'gi');
    return wordBoundaryRegex.test(text);
  }

  if (fuzzy) {
    return fuzzyMatch(searchText, searchQuery);
  }

  return searchText.includes(searchQuery);
}

/**
 * Simple fuzzy matching algorithm
 */
function fuzzyMatch(text: string, query: string): boolean {
  let textIndex = 0;
  let queryIndex = 0;
  
  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  return queryIndex === query.length;
}

/**
 * Multi-field search utility
 */
export function searchMultipleFields<T>(
  items: T[],
  query: string,
  fields: (keyof T)[],
  options?: {
    caseSensitive?: boolean;
    wholeWords?: boolean;
    fuzzy?: boolean;
  }
): T[] {
  if (!query || query.trim() === '') {
    return items;
  }

  return items.filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return searchText(value, query, options);
      }
      if (Array.isArray(value)) {
        return value.some(v => 
          typeof v === 'string' && searchText(v, query, options)
        );
      }
      return false;
    });
  });
}

/**
 * Category filter utility
 */
export function filterByCategory<T>(
  items: T[],
  selectedCategory: string | null,
  getCategoryFn: (item: T) => string
): T[] {
  if (!selectedCategory || selectedCategory === 'all') {
    return items;
  }
  
  return items.filter(item => getCategoryFn(item) === selectedCategory);
}

/**
 * Tag filter utility - items must have ALL specified tags
 */
export function filterByTags<T>(
  items: T[],
  selectedTags: string[],
  getTagsFn: (item: T) => string[]
): T[] {
  if (!selectedTags || selectedTags.length === 0) {
    return items;
  }
  
  return items.filter(item => {
    const itemTags = getTagsFn(item);
    return selectedTags.every(tag => itemTags.includes(tag));
  });
}

/**
 * Tag filter utility - items must have ANY of the specified tags
 */
export function filterByTagsAny<T>(
  items: T[],
  selectedTags: string[],
  getTagsFn: (item: T) => string[]
): T[] {
  if (!selectedTags || selectedTags.length === 0) {
    return items;
  }
  
  return items.filter(item => {
    const itemTags = getTagsFn(item);
    return selectedTags.some(tag => itemTags.includes(tag));
  });
}

/**
 * Generic property filter utility
 */
export function filterByProperty<T, K extends keyof T>(
  items: T[],
  property: K,
  value: T[K] | T[K][] | null | Record<string, any>
): T[] {
  if (value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return items;
  }
  
  if (Array.isArray(value)) {
    return items.filter(item => value.includes(item[property]));
  }
  
  return items.filter(item => item[property] === value);
}

/**
 * Date range filter utility
 */
export function filterByDateRange<T>(
  items: T[],
  startDate: Date | null,
  endDate: Date | null,
  getDateFn: (item: T) => Date
): T[] {
  return items.filter(item => {
    const itemDate = getDateFn(item);
    
    if (startDate && itemDate < startDate) {
      return false;
    }
    
    if (endDate && itemDate > endDate) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sort utility with multiple sort strategies
 */
export function sortItems<T>(
  items: T[],
  sortBy: keyof T | null,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] {
  if (!sortBy) {
    return items;
  }
  
  return [...items].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
    if (bValue == null) return sortOrder === 'asc' ? -1 : 1;
    
    // String comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    }
    
    // Number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Date comparison
    if (aValue instanceof Date && bValue instanceof Date) {
      const comparison = aValue.getTime() - bValue.getTime();
      return sortOrder === 'asc' ? comparison : -comparison;
    }
    
    // Boolean comparison
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      const aNum = aValue ? 1 : 0;
      const bNum = bValue ? 1 : 0;
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    // Fallback to string comparison
    const aStr = String(aValue);
    const bStr = String(bValue);
    const comparison = aStr.localeCompare(bStr);
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Apply pagination to a filtered array
 */
export function applyPagination<T>(
  items: T[],
  pagination: PaginationParams
): { items: T[]; meta: PaginationMeta } {
  const { page, limit, offset } = pagination;
  const start = offset || ((page - 1) * limit);
  const end = start + limit;
  
  return {
    items: items.slice(start, end),
    meta: createPaginationMeta(page, limit, items.length)
  };
}

/**
 * Comprehensive filter and search utility
 * Combines all filtering strategies into one function
 */
export function filterAndSearch<T>(
  items: T[],
  params: {
    query?: string;
    searchFields?: (keyof T)[];
    category?: string;
    getCategoryFn?: (item: T) => string;
    tags?: string[];
    getTagsFn?: (item: T) => string[];
    tagMatchMode?: 'all' | 'any';
    propertyFilters?: { [K in keyof T]?: T[K] | T[K][] };
    dateRange?: {
      start?: Date;
      end?: Date;
      getDateFn: (item: T) => Date;
    };
    sortBy?: keyof T;
    sortOrder?: 'asc' | 'desc';
    pagination?: PaginationParams;
    searchOptions?: {
      caseSensitive?: boolean;
      wholeWords?: boolean;
      fuzzy?: boolean;
    };
  }
): FilterResult<T> {
  let filtered = [...items];
  const appliedFilters: Record<string, any> = {};

  // Apply text search
  if (params.query && params.searchFields) {
    filtered = searchMultipleFields(
      filtered,
      params.query,
      params.searchFields,
      params.searchOptions
    );
    appliedFilters.query = params.query;
  }

  // Apply category filter
  if (params.category && params.getCategoryFn) {
    filtered = filterByCategory(filtered, params.category, params.getCategoryFn);
    appliedFilters.category = params.category;
  }

  // Apply tag filter
  if (params.tags && params.tags.length > 0 && params.getTagsFn) {
    const tagFilter = params.tagMatchMode === 'any' ? filterByTagsAny : filterByTags;
    filtered = tagFilter(filtered, params.tags, params.getTagsFn);
    appliedFilters.tags = params.tags;
  }

  // Apply property filters
  if (params.propertyFilters) {
    Object.entries(params.propertyFilters).forEach(([property, value]) => {
      if (value !== null && value !== undefined) {
        filtered = filterByProperty(filtered, property as keyof T, value);
        appliedFilters[property] = value;
      }
    });
  }

  // Apply date range filter
  if (params.dateRange) {
    filtered = filterByDateRange(
      filtered,
      params.dateRange.start || null,
      params.dateRange.end || null,
      params.dateRange.getDateFn
    );
    if (params.dateRange.start || params.dateRange.end) {
      appliedFilters.dateRange = {
        start: params.dateRange.start,
        end: params.dateRange.end
      };
    }
  }

  // Apply sorting
  if (params.sortBy) {
    filtered = sortItems(filtered, params.sortBy, params.sortOrder);
    appliedFilters.sort = { by: params.sortBy, order: params.sortOrder };
  }

  // Apply pagination
  let paginatedResult: { items: T[]; meta: PaginationMeta };
  if (params.pagination) {
    paginatedResult = applyPagination(filtered, params.pagination);
    appliedFilters.pagination = params.pagination;
  } else {
    paginatedResult = {
      items: filtered,
      meta: createPaginationMeta(1, filtered.length, filtered.length)
    };
  }

  return {
    items: paginatedResult.items,
    pagination: paginatedResult.meta,
    totalFiltered: filtered.length,
    appliedFilters
  };
}

/**
 * Extract unique values from array for filter options
 */
export function getUniqueValues<T, K extends keyof T>(
  items: T[],
  property: K
): T[K][] {
  const values = items.map(item => item[property]).filter(v => v != null);
  return Array.from(new Set(values));
}

/**
 * Extract unique categories for filter dropdown
 */
export function getUniqueCategories<T>(
  items: T[],
  getCategoryFn: (item: T) => string
): string[] {
  const categories = items.map(getCategoryFn).filter(c => c);
  return Array.from(new Set(categories)).sort();
}

/**
 * Extract unique tags for filter dropdown
 */
export function getUniqueTags<T>(
  items: T[],
  getTagsFn: (item: T) => string[]
): string[] {
  const allTags = items.flatMap(getTagsFn);
  return Array.from(new Set(allTags)).sort();
}