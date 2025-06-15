// Clean data section pattern from progress store (eliminates messy state management)

/**
 * Standard data section interface for clean state management
 * Based on the best pattern from progress store
 */
export interface DataSection<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

/**
 * Create empty data section with proper defaults
 */
export function createDataSection<T>(): DataSection<T> {
  return {
    data: null,
    isLoading: false,
    error: null,
    lastFetched: null,
  };
}

/**
 * Set data section to loading state
 */
export function setDataSectionLoading<T>(section: DataSection<T>): DataSection<T> {
  return {
    ...section,
    isLoading: true,
    error: null, // Clear previous errors when starting new request
  };
}

/**
 * Set data section with successful data
 */
export function setDataSectionSuccess<T>(
  section: DataSection<T>,
  data: T
): DataSection<T> {
  return {
    data,
    isLoading: false,
    error: null,
    lastFetched: new Date(),
  };
}

/**
 * Set data section with error
 */
export function setDataSectionError<T>(
  section: DataSection<T>,
  error: string
): DataSection<T> {
  return {
    ...section,
    isLoading: false,
    error,
    // Keep existing data and lastFetched on error
  };
}

/**
 * Clear error from data section
 */
export function clearDataSectionError<T>(section: DataSection<T>): DataSection<T> {
  return {
    ...section,
    error: null,
  };
}

/**
 * Check if data section needs refresh based on age
 */
export function dataSectionNeedsRefresh<T>(
  section: DataSection<T>,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): boolean {
  if (!section.lastFetched) {
    return true;
  }
  
  const ageMs = Date.now() - section.lastFetched.getTime();
  return ageMs > maxAgeMs;
}

/**
 * Check if data section has valid data
 */
export function dataSectionHasData<T>(section: DataSection<T>): section is DataSection<T> & { data: T } {
  return section.data !== null && section.data !== undefined;
}

/**
 * Check if data section is in error state
 */
export function dataSectionHasError<T>(section: DataSection<T>): boolean {
  return section.error !== null;
}

/**
 * Multi-section state management for complex stores
 */
export interface MultiSectionState {
  [key: string]: DataSection<any>;
}

/**
 * Create multi-section state with specified keys
 */
export function createMultiSectionState<T extends Record<string, any>>(
  keys: (keyof T)[]
): { [K in keyof T]: DataSection<T[K]> } {
  const state = {} as { [K in keyof T]: DataSection<T[K]> };
  
  keys.forEach((key) => {
    state[key] = createDataSection<T[typeof key & keyof T]>();
  });
  
  return state;
}

/**
 * Set loading state for specific section in multi-section state
 */
export function setMultiSectionLoading<T extends MultiSectionState>(
  state: T,
  sectionKey: keyof T
): T {
  return {
    ...state,
    [sectionKey]: setDataSectionLoading(state[sectionKey]),
  };
}

/**
 * Set success state for specific section in multi-section state
 */
export function setMultiSectionSuccess<T extends MultiSectionState, K extends keyof T>(
  state: T,
  sectionKey: K,
  data: T[K]['data']
): T {
  return {
    ...state,
    [sectionKey]: setDataSectionSuccess(state[sectionKey], data),
  };
}

/**
 * Set error state for specific section in multi-section state
 */
export function setMultiSectionError<T extends MultiSectionState>(
  state: T,
  sectionKey: keyof T,
  error: string
): T {
  return {
    ...state,
    [sectionKey]: setDataSectionError(state[sectionKey], error),
  };
}

/**
 * Check if any section in multi-section state is loading
 */
export function isAnyMultiSectionLoading<T extends MultiSectionState>(
  state: T,
  sections?: (keyof T)[]
): boolean {
  const keysToCheck = sections || Object.keys(state);
  return keysToCheck.some(key => state[key].isLoading);
}

/**
 * Check if any section in multi-section state has errors
 */
export function hasAnyMultiSectionError<T extends MultiSectionState>(
  state: T,
  sections?: (keyof T)[]
): boolean {
  const keysToCheck = sections || Object.keys(state);
  return keysToCheck.some(key => state[key].error !== null);
}

/**
 * Get all errors from multi-section state
 */
export function getMultiSectionErrors<T extends MultiSectionState>(
  state: T,
  sections?: (keyof T)[]
): Record<string, string> {
  const keysToCheck = sections || Object.keys(state);
  const errors: Record<string, string> = {};
  
  keysToCheck.forEach(key => {
    const section = state[key];
    if (section.error) {
      errors[String(key)] = section.error;
    }
  });
  
  return errors;
}

/**
 * Clear all errors from multi-section state
 */
export function clearAllMultiSectionErrors<T extends MultiSectionState>(
  state: T,
  sections?: (keyof T)[]
): T {
  const keysToCheck = sections || Object.keys(state);
  const newState = { ...state };
  
  keysToCheck.forEach(key => {
    if (newState[key].error) {
      newState[key] = clearDataSectionError(newState[key]) as T[typeof key];
    }
  });
  
  return newState;
}

/**
 * Paginated data section for lists with pagination
 */
export interface PaginatedDataSection<T> extends DataSection<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
}

/**
 * Create paginated data section
 */
export function createPaginatedDataSection<T>(): PaginatedDataSection<T> {
  return {
    ...createDataSection<T[]>(),
    pagination: null,
  };
}

/**
 * Set paginated data section with success data
 */
export function setPaginatedDataSectionSuccess<T>(
  section: PaginatedDataSection<T>,
  data: T[],
  pagination: PaginatedDataSection<T>['pagination']
): PaginatedDataSection<T> {
  return {
    data,
    isLoading: false,
    error: null,
    lastFetched: new Date(),
    pagination,
  };
}

/**
 * Append data to paginated section (for load more functionality)
 */
export function appendToPaginatedDataSection<T>(
  section: PaginatedDataSection<T>,
  newData: T[],
  newPagination: PaginatedDataSection<T>['pagination']
): PaginatedDataSection<T> {
  const existingData = section.data || [];
  
  return {
    data: [...existingData, ...newData],
    isLoading: false,
    error: null,
    lastFetched: new Date(),
    pagination: newPagination,
  };
}

/**
 * Reset paginated data section to first page
 */
export function resetPaginatedDataSection<T>(
  section: PaginatedDataSection<T>
): PaginatedDataSection<T> {
  return {
    data: null,
    isLoading: false,
    error: null,
    lastFetched: null,
    pagination: null,
  };
}