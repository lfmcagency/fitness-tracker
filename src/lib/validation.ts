import { z } from 'zod';
import { NextRequest } from 'next/server';
import { apiError } from './api-utils';
import { ValidationResult, Validator, ErrorCode } from '../types/validation';
import { PaginationParams } from '../types/api/pagination';

/**
 * Validate request body against a Zod schema
 * @param req Next.js request object
 * @param schema Zod schema to validate against
 * @returns Validated data or throws an API error response
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.Schema<T>
): Promise<T> {
  try {
    // Defensively handle JSON parsing
    let body;
    try {
      body = await req.json();
    } catch (error) {
      throw apiError('Invalid JSON format in request body', 400, ErrorCode.INVALID_JSON);
    }
    
    // Validate with zod schema
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        throw apiError(
          'Validation error',
          400,
          ErrorCode.VALIDATION,
          { errors: formattedErrors }
        );
      }
      throw error;
    }
  } catch (error) {
    // If the error is already an API error response, propagate it
    if (error instanceof Error && 'status' in error && 'json' in error) {
      throw error;
    }
    
    throw apiError('Invalid request data', 400, ErrorCode.VALIDATION);
  }
}

/**
 * Basic validation function for checking if a value is a string
 * @param value Value to validate
 * @param required Whether the value is required
 * @returns Validation result
 */
export function validateString(value: unknown, required: boolean = true): ValidationResult {
  if (value === undefined || value === null) {
    return {
      valid: !required,
      errors: required ? ['Value is required'] : undefined
    };
  }
  
  if (typeof value !== 'string') {
    return {
      valid: false,
      errors: ['Value must be a string']
    };
  }
  
  if (required && value.trim() === '') {
    return {
      valid: false,
      errors: ['Value cannot be empty']
    };
  }
  
  return { valid: true };
}

/**
 * Email validation function
 * @param value Value to validate
 * @returns Validation result
 */
export function validateEmail(value: unknown): ValidationResult {
  const stringResult = validateString(value, true);
  if (!stringResult.valid) return stringResult;
  
  const email = value as string;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      errors: ['Invalid email format']
    };
  }
  
  return { valid: true };
}

// Define schemas outside the function to avoid module structure issues
export const schemas = {
  // XP related schemas
  xp: {
    addXp: z.object({
      xpAmount: z.number().positive('XP amount must be positive'),
      source: z.string().min(1, 'Source is required'),
      category: z.enum(['core', 'push', 'pull', 'legs']).optional(),
      details: z.string().optional()
    }),
    
    awardAchievement: z.object({
      achievementId: z.string().min(1, 'Achievement ID is required')
    })
  },
  
  // Category related schemas
  category: z.enum(['core', 'push', 'pull', 'legs']),
  
  // Time range for history queries
  timeRange: z.enum(['day', 'week', 'month', 'year', 'all']),
  
  // Grouping option for data aggregation
  groupBy: z.enum(['day', 'week', 'month']),
  
  // Pagination schema
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20)
  }),
  
  // Maintenance actions
  maintenance: z.object({
    action: z.enum(['summarize', 'purge', 'auto']),
    keepDays: z.number().int().min(7).max(365).optional(),
    userId: z.string().optional()
  })
};

/**
 * Extract and validate pagination parameters from URL
 * @param url Request URL
 * @returns Validated pagination parameters
 */
export function extractPagination(url: URL): PaginationParams & { skip: number } {
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');
  const sortParam = url.searchParams.get('sort');
  const orderParam = url.searchParams.get('order') as 'asc' | 'desc' | null;
  
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  
  const validatedPage = isNaN(page) || page < 1 ? 1 : page;
  const validatedLimit = isNaN(limit) || limit < 1 || limit > 100 ? 20 : limit;
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    sort: sortParam || undefined,
    order: orderParam || undefined,
    skip: calculateSkip(validatedPage, validatedLimit)
  };
}

/**
 * Calculate skip value for pagination
 * @param page Page number
 * @param limit Items per page
 * @returns Number of items to skip
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}