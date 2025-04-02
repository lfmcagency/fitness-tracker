// src/app/api/user/weight/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import mongoose, { isValidObjectId } from 'mongoose';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthLevel } from '@/lib/auth-utils';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { ErrorCode } from '@/types/validation';
import { IUser, IWeightEntry as DbWeightEntry } from '@/types/models/user';

// --- FIX: Import types from their specific definition files ---
import {
    WeightHistoryApiResponse,
    WeightHistoryPayload,
    AddedWeightEntryApiResponse,
    AddedWeightEntryPayload,
    AddWeightEntryRequest
} from '@/types/api/weightResponses';
// --- FIX: Import ApiWeightEntry directly from userResponses ---
import { ApiWeightEntry } from '@/types/api/userResponses';

/** GET /api/user/weight */
export const GET = withAuth<WeightHistoryPayload>(
  async (req: NextRequest, userId: string) => {
    try {
      await dbConnect();
      if (!isValidObjectId(userId)) { return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION); }

      // Params parsing
      const url = new URL(req.url);
      let limit = 30, sortOrder: 1 | -1 = -1;
      const limitParam = url.searchParams.get('limit');
      if (limitParam) { const p = parseInt(limitParam); if (!isNaN(p) && p > 0) limit = Math.min(p, 200); }
      if (url.searchParams.get('sort')?.toLowerCase() === 'asc') sortOrder = 1;

      const user = await User.findById(userId).select('bodyweight settings.weightUnit').lean() as Pick<IUser, 'bodyweight' | 'settings'> | null;

      if (!user) {
         console.warn(`[API Weight GET] User not found: ${userId}`);
         return apiError('User not found', 404, ErrorCode.NOT_FOUND);
      }

      const weightHistory = Array.isArray(user.bodyweight) ? user.bodyweight : [];

      // Map DB entries to API Weight Entries
      const sortedHistory = [...weightHistory]
         .sort((a, b) => (new Date(a.date).getTime() - new Date(b.date).getTime()) * sortOrder)
         .slice(0, limit)
         .map((entry): ApiWeightEntry => ({ // Ensure mapping includes _id if present
             _id: entry._id?.toString(),
             weight: entry.weight,
             date: entry.date.toISOString(),
             notes: entry.notes
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
         } catch (error) { console.error('[API Weight GET] Error calculating weight trends:', error); }
      }

      const weightUnit = user.settings?.weightUnit || 'kg';
      const payload: WeightHistoryPayload = { history: sortedHistory, count: sortedHistory.length, unit: weightUnit, trends };
      return apiResponse<WeightHistoryPayload>(payload, true, 'Weight history retrieved');

    } catch (error: unknown) { return handleApiError(error, 'Error retrieving weight history'); }
  }, AuthLevel.USER
);

/** POST /api/user/weight */
export const POST = withAuth<AddedWeightEntryPayload>(
  async (req: NextRequest, userId: string) => {
    let body: AddWeightEntryRequest;
    try {
      await dbConnect();
      if (!isValidObjectId(userId)) { return apiError('Invalid user identifier', 400, ErrorCode.VALIDATION); }

      try { body = await req.json(); }
      catch (error) { return apiError('Invalid JSON in request body', 400, ErrorCode.INVALID_JSON); }

      // Validation
      if (body.weight === undefined || body.weight === null) { return apiError('Weight is required', 400, ErrorCode.VALIDATION); }
      let weightValue: number = typeof body.weight === 'string' ? parseFloat(body.weight) : body.weight;
      if (isNaN(weightValue) || weightValue < 1 || weightValue > 999) { return apiError('Invalid weight (1-999)', 400, ErrorCode.VALIDATION); }
      let entryDate = new Date();
      if (body.date) { const d = new Date(body.date); if(!isNaN(d.getTime())) entryDate=d; else return apiError('Invalid date', 400, ErrorCode.VALIDATION); }
      const notes = typeof body.notes === 'string' ? body.notes.trim().substring(0, 500) : undefined;

      const weightEntry: Omit<DbWeightEntry, '_id' | 'createdAt'> = { weight: weightValue, date: entryDate, notes };

      const updatedUser = await User.findByIdAndUpdate(userId, {$push: { bodyweight: { $each: [weightEntry], $sort: { date: -1 } } }}, { new: true }) as IUser | null;

      if (!updatedUser) {
        console.warn(`[API Weight POST] User not found during update: ${userId}`);
        return apiError('User not found during update', 404, ErrorCode.NOT_FOUND);
      }

      // Find added entry reliably
      const addedEntry = updatedUser.bodyweight?.find(e => e.date.getTime() === entryDate.getTime() && e.weight === weightValue);

      if (!addedEntry || !addedEntry._id) {
         console.error(`[API Weight POST] Could not find added entry for user ${userId}`);
         const latestEntry = updatedUser.bodyweight?.[0]; // Fallback attempt
         if(latestEntry?._id) {
             const fallbackResponseEntry: ApiWeightEntry = { _id: latestEntry._id.toString(), weight: latestEntry.weight, date: latestEntry.date.toISOString(), notes: latestEntry.notes };
             const fallbackPayload: AddedWeightEntryPayload = { entry: fallbackResponseEntry, count: updatedUser.bodyweight?.length || 0 };
             return apiResponse<AddedWeightEntryPayload>(fallbackPayload, true, 'Weight entry added (confirmation fallback)', 201);
         }
         return apiError('Entry saved, confirmation failed.', 500);
      }

      // Format the confirmed added entry for the response
      const responseEntry: ApiWeightEntry = {
          _id: addedEntry._id.toString(),
          weight: addedEntry.weight,
          date: addedEntry.date.toISOString(),
          notes: addedEntry.notes
      };
      const payload: AddedWeightEntryPayload = { entry: responseEntry, count: updatedUser.bodyweight?.length || 0 };
      return apiResponse<AddedWeightEntryPayload>(payload, true, 'Weight entry added', 201);

    } catch (error: unknown) {
      if (error instanceof mongoose.Error.ValidationError) { return apiError(`Validation failed: ${error.message}`, 400, ErrorCode.VALIDATION); }
      return handleApiError(error, 'Error adding weight entry');
    }
  }, AuthLevel.USER
);