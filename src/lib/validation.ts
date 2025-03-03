import { z } from 'zod';
import { NextRequest } from 'next/server';
import { apiError } from './api-utils';

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
    const body = await req.json();
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
        'ERR_VALIDATION',  // Proper error code string
        { errors: formattedErrors }  // Details as 4th parameter
      );
    }
    
    throw apiError('Invalid request data', 400, 'ERR_VALIDATION', error);
  }
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
export function extractPagination(url: URL): { page: number; limit: number } {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: isNaN(limit) || limit < 1 || limit > 100 ? 20 : limit
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