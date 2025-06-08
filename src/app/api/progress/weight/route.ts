// src/app/api/progress/weight/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/lib/db';
import UserProgress from '@/models/UserProgress';
import User from '@/models/User'; // Still need for weight unit settings
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { ErrorCode } from '@/types/validation';

// --- Import types from their specific definition files ---
import {
    WeightHistoryApiResponse,
    WeightHistoryPayload,
    AddedWeightEntryApiResponse,
    AddedWeightEntryPayload,
    AddWeightEntryRequest
} from '@/types/api/weightResponses';
import { ApiWeightEntry } from '@/types/api/userResponses';

/** GET /api/progress/weight */
export const GET = withAuth<WeightHistoryPayload>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      if (!isValidObjectId(userId)) { 
        return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION); 
      }

      // Params parsing
      const url = new URL(req.url);
      let limit = 30, sortOrder: 1 | -1 = -1;
      const limitParam = url.searchParams.get('limit');
      if (limitParam) { 
        const p = parseInt(limitParam); 
        if (!isNaN(p) && p > 0) limit = Math.min(p, 200); 
      }
      if (url.searchParams.get('sort')?.toLowerCase() === 'asc') sortOrder = 1;

      // Get progress data and user settings
      const [progress, user] = await Promise.all([
        UserProgress.findOne({ userId }).select('bodyweight').lean(),
        User.findById(userId).select('settings.weightUnit').lean()
      ]);

      if (!progress) {
         console.warn(`[API Weight GET] User progress not found: ${userId}`);
         return apiError('User progress not found', 404, ErrorCode.NOT_FOUND);
      }

      const weightHistory = Array.isArray(progress.bodyweight) ? progress.bodyweight : [];

      // Map DB entries to API Weight Entries
      const sortedHistory = [...weightHistory]
         .sort((a, b) => (new Date(a.date).getTime() - new Date(b.date).getTime()) * sortOrder)
         .slice(0, limit)
         .map((entry: any): ApiWeightEntry => ({ // Use 'any' to access _id
             _id: entry._id?.toString(),
             weight: entry.value, // Note: UserProgress uses 'value' field
             date: entry.date.toISOString(),
             notes: undefined // UserProgress doesn't have notes field
         }));

      // Trend Calculation
      let trends = null;
      const historyForTrends = sortOrder === 1 ? sortedHistory : [...sortedHistory].reverse();
      if (historyForTrends.length >= 2) {
         try {
            const oldestEntry = historyForTrends[0];
            const newestEntry = historyForTrends[historyForTrends.length - 1];
            const oldestDate = new Date(oldestEntry.date);
            const newestDate = new Date(newestEntry.date);
            const daysDiff = Math.max(1, Math.round((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
            const weightDiff = newestEntry.weight - oldestEntry.weight;
            const weeklyRate = (weightDiff / daysDiff) * 7;
            trends = {
                totalChange: parseFloat(weightDiff.toFixed(1)),
                period: daysDiff,
                weeklyRate: parseFloat(weeklyRate.toFixed(2)),
                direction: (weightDiff > 0 ? 'gain' : weightDiff < 0 ? 'loss' : 'maintain') as 'gain' | 'loss' | 'maintain'
            };
         } catch (error) { 
           console.error('[API Weight GET] Error calculating weight trends:', error); 
         }
      }

      const weightUnit = user?.settings?.weightUnit || 'kg';
      const payload: WeightHistoryPayload = { 
        history: sortedHistory, 
        count: sortedHistory.length, 
        unit: weightUnit, 
        trends 
      };
      return apiResponse<WeightHistoryPayload>(payload, true, 'Weight history retrieved');

    } catch (error: unknown) { 
      return handleApiError(error, 'Error retrieving weight history'); 
    }
  }, AuthLevel.USER
);

/** POST /api/progress/weight */
export const POST = withAuth<AddedWeightEntryPayload>(
  async (req: NextRequest, userId: string) => {
    let body: AddWeightEntryRequest;
    try {
      await dbConnect();
      if (!isValidObjectId(userId)) { 
        return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION); 
      }

      try { 
        body = await req.json(); 
      } catch (error) { 
        return apiError('Invalid JSON in request body', 400, ErrorCode.INVALID_JSON); 
      }

      // Validation
      if (body.weight === undefined || body.weight === null) { 
        return apiError('Weight is required', 400, ErrorCode.VALIDATION); 
      }
      let weightValue: number = typeof body.weight === 'string' ? parseFloat(body.weight) : body.weight;
      if (isNaN(weightValue) || weightValue < 1 || weightValue > 999) { 
        return apiError('Invalid weight (1-999)', 400, ErrorCode.VALIDATION); 
      }
      let entryDate = new Date();
      if (body.date) { 
        const d = new Date(body.date); 
        if(!isNaN(d.getTime())) entryDate = d; 
        else return apiError('Invalid date', 400, ErrorCode.VALIDATION); 
      }

      // Create weight entry for UserProgress model
      const weightEntry = { 
        value: weightValue, // UserProgress uses 'value' field
        date: entryDate,
        unit: 'kg' as 'kg' | 'lb' // Type assertion to match BodyweightEntry type
      };

      // Find or create user progress document
      let userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) {
        userProgress = await UserProgress.createInitialProgress(new mongoose.Types.ObjectId(userId));
      }

      // Add the weight entry
      userProgress.bodyweight.push(weightEntry);
      
      // Sort bodyweight entries by date (newest first)
      userProgress.bodyweight.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      await userProgress.save();

      // Find the added entry (should be the one we just added)
      const addedEntry = userProgress.bodyweight.find((e: any) => 
        e.date.getTime() === entryDate.getTime() && e.value === weightValue
      );

      if (!addedEntry || !(addedEntry as any)._id) {
         console.error(`[API Weight POST] Could not find added entry for user ${userId}`);
         const latestEntry = userProgress.bodyweight[0]; // Fallback attempt
         if(latestEntry && (latestEntry as any)._id) {
             const fallbackResponseEntry: ApiWeightEntry = { 
               _id: (latestEntry as any)._id.toString(), 
               weight: latestEntry.value, 
               date: latestEntry.date.toISOString(),
               notes: undefined 
             };
             const fallbackPayload: AddedWeightEntryPayload = { 
               entry: fallbackResponseEntry, 
               count: userProgress.bodyweight.length 
             };
             return apiResponse<AddedWeightEntryPayload>(fallbackPayload, true, 'Weight entry added (confirmation fallback)', 201);
         }
         return apiError('Entry saved, confirmation failed.', 500);
      }

      // Format the confirmed added entry for the response
      const responseEntry: ApiWeightEntry = {
          _id: (addedEntry as any)._id.toString(),
          weight: addedEntry.value,
          date: addedEntry.date.toISOString(),
          notes: undefined
      };
      const payload: AddedWeightEntryPayload = { 
        entry: responseEntry, 
        count: userProgress.bodyweight.length 
      };
      return apiResponse<AddedWeightEntryPayload>(payload, true, 'Weight entry added', 201);

    } catch (error: unknown) {
      if (error instanceof mongoose.Error.ValidationError) { 
        return apiError(`Validation failed: ${error.message}`, 400, ErrorCode.VALIDATION); 
      }
      return handleApiError(error, 'Error adding weight entry');
    }
  }, AuthLevel.USER
);