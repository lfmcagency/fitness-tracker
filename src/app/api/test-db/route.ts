// src/app/api/test-db/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { dbConnect } from '@/lib/db';;
import mongoose from "mongoose";

/**
 * GET /api/test-db
 * Simple database connection test endpoint
 */
export async function GET(req: NextRequest) {
  // Record start time for response time metrics
  const startTime = Date.now();
  
  try {
    // Create response object
    const response = {
      success: false,
      database: {
        connected: false,
        readyState: 0,
        host: null,
        name: null
      },
      timing: {
        start: startTime,
        end: 0,
        duration: 0
      }
    };
    
    try {
      // Try to connect to database
      await dbConnect();
      
      // Get connection state
      response.database.readyState = mongoose.connection.readyState;
      response.database.connected = mongoose.connection.readyState === 1;
      
      // Only include connection details if connected
      if (response.database.connected) {
        response.database.host = mongoose.connection.host;
        response.database.name = mongoose.connection.name;
      }
      
      response.success = response.database.connected;
    } catch (dbError) {
      console.error('Database connection test error:', dbError);
      
      // Add error details
      response.error = {
        message: 'Database connection failed',
        details: process.env.NODE_ENV === 'development' ? dbError.message : 'Connection error'
      };
    }
    
    // Calculate response time
    const endTime = Date.now();
    response.timing.end = endTime;
    response.timing.duration = endTime - startTime;
    
    // Set appropriate HTTP status
    const httpStatus = response.success ? 200 : 500;
    
    return apiResponse(
      response, 
      response.success, 
      response.success ? 'Database connected successfully' : 'Database connection failed',
      httpStatus
    );
  } catch (error) {
    return handleApiError(error, "Error testing database connection");
  }
}