// src/app/api/user/weight/route.ts (with defensive programming)
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { isValidObjectId } from 'mongoose';

/**
 * GET /api/user/weight
 * Get user weight history
 */
export const GET = withAuth<ResponseType['data']>(
  async (req: NextRequest, userId: string) => {
    try {
    await dbConnect();
    
    // Validate userId to prevent MongoDB injection
    if (!userId || !isValidObjectId(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
    }
    
    // Parse query parameters with defensive handling
    const url = new URL(req.url);
    let limit = 30; // Default to last 30 entries
    try {
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const parsedLimit = parseInt(limitParam);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100); // Cap at 100 to prevent abuse
        }
      }
    } catch (error) {
      console.error('Error parsing limit parameter:', error);
      // Continue with default value
    }
    
    // Get user with weight history
    const user = await User.findById(userId).select('bodyweight settings');
    
    if (!user) {
      return apiError('User not found', 404, 'ERR_NOT_FOUND');
    }
    
    // Ensure bodyweight is an array
    const weightHistory = Array.isArray(user.bodyweight) ? user.bodyweight : [];
    
    // Sort by date descending and limit results
    const sortedHistory = [...weightHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
    
    // Calculate trends if we have enough data
    let trends = null;
    if (sortedHistory.length >= 2) {
      try {
        const oldestEntry = sortedHistory[sortedHistory.length - 1];
        const newestEntry = sortedHistory[0];
        const oldestDate = new Date(oldestEntry.date);
        const newestDate = new Date(newestEntry.date);
        
        // Calculate days between
        const daysDiff = Math.max(1, Math.round((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Calculate weight difference and rate
        const weightDiff = newestEntry.weight - oldestEntry.weight;
        const weeklyRate = (weightDiff / daysDiff) * 7;
        
        trends = {
          totalChange: parseFloat(weightDiff.toFixed(1)),
          period: daysDiff,
          weeklyRate: parseFloat(weeklyRate.toFixed(2)),
          direction: weightDiff > 0 ? 'gain' : weightDiff < 0 ? 'loss' : 'maintain'
        };
      } catch (error) {
        console.error('Error calculating weight trends:', error);
        // Continue without trends
      }
    }
    
    // Get unit preference with fallback
    const weightUnit = user.settings?.weightUnit || 'kg';
    
    return apiResponse({
      history: sortedHistory,
      count: sortedHistory.length,
      unit: weightUnit,
      trends
    }, true, 'Weight history retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving weight history');
  }
}, AuthLevel.DEV_OPTIONAL);

/**
 * POST /api/user/weight
 * Add a new weight entry
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Validate userId to prevent MongoDB injection
    if (!userId || !isValidObjectId(userId)) {
      return apiError('Invalid user ID', 400, 'ERR_VALIDATION');
    }
    
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return apiError('Invalid JSON in request body', 400, 'ERR_INVALID_JSON');
    }
    
    // Validate weight with comprehensive checks
    if (body.weight === undefined || body.weight === null) {
      return apiError('Weight is required', 400, 'ERR_VALIDATION');
    }
    
    let weightValue: number;
    
    // Handle string or number input
    if (typeof body.weight === 'string') {
      // Parse string to number
      try {
        weightValue = parseFloat(body.weight);
      } catch (error) {
        return apiError('Weight must be a valid number', 400, 'ERR_VALIDATION');
      }
    } else if (typeof body.weight === 'number') {
      weightValue = body.weight;
    } else {
      return apiError('Weight must be a number', 400, 'ERR_VALIDATION');
    }
    
    // Check if weight is within reasonable range (1-999 kg)
    if (isNaN(weightValue) || weightValue < 1 || weightValue > 999) {
      return apiError('Weight must be between 1 and 999', 400, 'ERR_VALIDATION');
    }
    
    // Parse date if provided
    let entryDate = new Date();
    if (body.date) {
      try {
        const parsedDate = new Date(body.date);
        if (!isNaN(parsedDate.getTime())) {
          entryDate = parsedDate;
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        // Continue with current date as fallback
      }
    }
    
    // Optional notes field
    const notes = typeof body.notes === 'string' ? body.notes : undefined;
    
    // Create weight entry
    const weightEntry = {
      weight: weightValue,
      date: entryDate,
      notes
    };
    
    // Find user and update with defensive error handling
    let user;
    try {
      user = await User.findById(userId);
      
      if (!user) {
        return apiError('User not found', 404, 'ERR_NOT_FOUND');
      }
      
      // Initialize bodyweight array if it doesn't exist
      if (!Array.isArray(user.bodyweight)) {
        user.bodyweight = [];
      }
      
      // Add the new entry
      user.bodyweight.push(weightEntry);
      
      // Save user with new weight entry
      await user.save();
    } catch (error) {
      return handleApiError(error, 'Error saving weight entry');
    }
    
    // Return the newly created entry
    return apiResponse({
      entry: weightEntry,
      count: user.bodyweight.length
    }, true, 'Weight entry added successfully', 201);
  } catch (error) {
    return handleApiError(error, 'Error adding weight entry');
  }
}, AuthLevel.DEV_OPTIONAL);