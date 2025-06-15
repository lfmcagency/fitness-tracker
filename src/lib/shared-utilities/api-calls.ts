// Standard API call patterns used by all stores (eliminates 8x duplication)

/**
 * Standard API response structure expected across all domains
 */
export interface ApiCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

/**
 * Configuration for API calls
 */
export interface ApiCallConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Standard error handling for API responses
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Core API call utility - handles fetch, parsing, and error handling
 * Used by all stores to eliminate duplication
 */
export async function makeApiCall<T = any>(
  url: string,
  config: ApiCallConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 10000
  } = config;

  // Build fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle HTTP errors
    if (!response.ok) {
      throw new ApiError(
        `Request failed: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    // Parse JSON response
    const result: ApiCallResult<T> = await response.json();

    // Handle API-level errors
    if (!result.success) {
      throw new ApiError(
        result.error?.message || result.message || 'API request failed',
        response.status,
        result.error?.code
      );
    }

    return result.data as T;

  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, 'TIMEOUT');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network/parsing errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(
  url: string,
  params?: Record<string, string | number | boolean>
): Promise<T> {
  let fullUrl = url;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  return makeApiCall<T>(fullUrl, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  url: string,
  data?: any
): Promise<T> {
  return makeApiCall<T>(url, {
    method: 'POST',
    body: data
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  url: string,
  data?: any
): Promise<T> {
  return makeApiCall<T>(url, {
    method: 'PUT',
    body: data
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = any>(
  url: string,
  data?: any
): Promise<T> {
  return makeApiCall<T>(url, {
    method: 'PATCH',
    body: data
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  url: string
): Promise<T> {
  return makeApiCall<T>(url, { method: 'DELETE' });
}

/**
 * Utility for handling common loading state pattern
 * Used by stores to standardize loading/error management
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export function createLoadingState(): LoadingState {
  return {
    isLoading: false,
    error: null
  };
}

export function setLoading(state: LoadingState): LoadingState {
  return {
    isLoading: true,
    error: null
  };
}

export function setSuccess(state: LoadingState): LoadingState {
  return {
    isLoading: false,
    error: null
  };
}

export function setError(state: LoadingState, error: string): LoadingState {
  return {
    isLoading: false,
    error
  };
}

/**
 * Retry utility for failed API calls
 */
export async function retryApiCall<T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('API call failed');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCallFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on certain errors
      if (error instanceof ApiError) {
        if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
          throw error;
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

/**
 * Batch API call utility for processing multiple requests
 */
export async function batchApiCalls<T>(
  requests: Array<() => Promise<T>>,
  concurrency: number = 3
): Promise<Array<T | Error>> {
  const results: Array<T | Error> = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (request) => {
      try {
        return await request();
      } catch (error) {
        return error instanceof Error ? error : new Error('Unknown error');
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}