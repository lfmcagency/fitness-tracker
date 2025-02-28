import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { apiResponse, handleApiError } from '@/lib/api-utils';

export type ApiHandler = (
  req: NextRequest,
  params: { [key: string]: string }
) => Promise<NextResponse>;

/**
 * Wraps an API handler function with standard error handling and database connection
 */
export function withApiHandler(handler: ApiHandler) {
  return async (req: NextRequest, params: { [key: string]: string }) => {
    try {
      // Connect to the database
      await dbConnect();
      
      // Call the handler
      return await handler(req, params);
    } catch (error) {
      // Use the standardized error handler
      return handleApiError(error, 'API request failed');
    }
  };
}

/**
 * Wraps a database query in a standard API response format
 */
export async function withDbQuery<T>(
  query: () => Promise<T>,
  errorMessage: string = 'Database query failed'
): Promise<NextResponse> {
  try {
    await dbConnect();
    const result = await query();
    return apiResponse(result);
  } catch (error) {
    return handleApiError(error, errorMessage);
  }
}