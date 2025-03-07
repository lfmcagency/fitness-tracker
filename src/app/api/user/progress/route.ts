// File: src/app/api/user/progress/route.ts

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db';;
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';
import { withAuth, AuthLevel, getUserProgressOrCreate } from '@/lib/auth-utils';
import { ProgressCategory, isValidCategory } from '@/lib/category-progress';
import { awardXp } from '@/lib/xp-manager-improved';

/**
 * POST /api/user/progress
 * 
 * Add XP to user's progress with optional category
 * 
 * Request body:
 * - amount: number (required) - Amount of XP to award
 * - source: string (required) - The activity that earned the XP
 * - category: string (optional) - One of: "core", "push", "pull", "legs"
 * - details: string (optional) - Additional context
 */
export const POST = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get and validate request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return apiError('XP amount must be a positive number', 400);
    }
    
    if (!body.source || typeof body.source !== 'string' || body.source.trim() === '') {
      return apiError('Source must be a non-empty string', 400);
    }
    
    // Extract validated values
    const amount = body.amount;
    const source = body.source;
    const details = body.details || '';
    
    // Validate category if provided
    let category: ProgressCategory | undefined;
    
    if (body.category) {
      if (!isValidCategory(body.category)) {
        return apiError(`Invalid category: ${body.category}. Must be one of: core, push, pull, legs`, 400);
      }
      category = body.category as ProgressCategory;
    }
    
    // Award XP using the xp-manager-improved utility
    const result = await awardXp(
      userId, 
      amount, 
      source, 
      category,
      details
    );
    
    // Return result with appropriate message
    return apiResponse({
      success: true,
      data: result,
      message: result.leveledUp
        ? `Level up! You are now level ${result.currentLevel}` // Fixed: newLevel → currentLevel
        : `Awarded ${amount} XP! ${result.xpToNextLevel} XP until next level.`
    }, true);
  } catch (error) {
    return handleApiError(error, 'Error awarding XP');
  }
}, AuthLevel.REQUIRED);

/**
 * GET /api/user/progress
 * 
 * Get user's progress summary
 */
export const GET = withAuth(async (req: NextRequest, userId) => {
  try {
    await dbConnect();
    
    // Get or create user progress
    const userProgress = await getUserProgressOrCreate(userId);
    
    if (!userProgress) {
      return apiError('Failed to retrieve user progress', 500);
    }
    
    // Return formatted progress data
    return apiResponse({
      level: userProgress.level,
      totalXp: userProgress.totalXp,
      xpToNextLevel: userProgress.getXpToNextLevel(),
      percentToNextLevel: Math.floor(
        ((userProgress.totalXp % userProgress.getNextLevelXp()) / userProgress.getXpToNextLevel()) * 100
      ),
      categories: {
        core: {
          level: userProgress.categoryProgress.core.level,
          xp: userProgress.categoryXp.core
        },
        push: {
          level: userProgress.categoryProgress.push.level,
          xp: userProgress.categoryXp.push
        },
        pull: {
          level: userProgress.categoryProgress.pull.level,
          xp: userProgress.categoryXp.pull
        },
        legs: {
          level: userProgress.categoryProgress.legs.level,
          xp: userProgress.categoryXp.legs
        }
      },
      recentActivity: userProgress.xpHistory
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(tx => ({
          date: tx.date,
          amount: tx.amount,
          source: tx.source,
          category: tx.category
        }))
    }, true, 'User progress retrieved successfully');
  } catch (error) {
    return handleApiError(error, 'Error retrieving user progress');
  }
}, AuthLevel.REQUIRED);