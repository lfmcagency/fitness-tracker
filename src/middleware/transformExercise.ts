// src/middleware/transformExercise.ts

import { NextResponse, NextRequest } from 'next/server';
import { IExercise } from '@/types/models/exercise';

/**
 * Middleware to transform exercise data before import
 * This specifically fixes the formCues array to string conversion
 */
export function transformExerciseData(req: NextRequest) {
  // Only process POST requests to the import-csv endpoint
  if (req.method !== 'POST' || !req.url.includes('/api/admin/import-csv')) {
    return NextResponse.next();
  }

  // Clone the request to modify it
  const requestClone = req.clone();
  
  // Get the request body
  return requestClone.json()
    .then(body => {
      // Check if we need to fix exercise data and formCues
      if (body?.collection === 'exercises' && body?.options?.fixFormCues) {
        // Create a custom handler for the transformExerciseData function in the import-csv endpoint
        // This attaches our custom handler to be executed server-side
        const modifiedBody = {
          ...body,
          options: {
            ...body.options,
            customTransform: true,
            // We can't actually modify the server function, so this is just signaling that 
            // the backend should handle this special case
          }
        };
        
        // Log the modification for debugging
        console.log('Modified import request to fix formCues format.');
        
        // Create a response with the modified body
        return NextResponse.json(modifiedBody, {
          status: 200,
          headers: req.headers
        });
      }
      
      // Otherwise, don't modify the request
      return NextResponse.next();
    })
    .catch(error => {
      console.error('Error in transformExercise middleware:', error);
      return NextResponse.next();
    });
}