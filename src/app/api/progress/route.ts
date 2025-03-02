export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import Achievement from '@/models/Achievement';
import { Types } from 'mongoose';
import { getAuth } from '@/lib/auth';
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/progress
 * 
 * Retrieves the authenticated user's progress data, including:
 * - Total XP and current level
 * - XP required for next level
 * - Category-specific XP and levels
 * - Recent achievements
 * - Progress history summary
 * 
 * Creates a new progress record if one doesn't exist.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication in production
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Authentication required', 401);
    }
    
    const userId = session?.user?.id || '000000000000000000000000'; // Mock ID for development
    let userObjectId: Types.ObjectId;
    
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return apiError('Invalid user ID', 400);
    }
    
    // Try to get the user's progress document
    let userProgress = await UserProgress.findOne({ userId: userObjectId });
    
    // If no progress document exists, create one with initial values
    if (!userProgress) {
      try {
        userProgress = await UserProgress.createInitialProgress(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Failed to create initial progress record');
      }
    }
    
    // Get recent achievements by IDs
    let recentAchievements = [];
    if (userProgress.achievements && userProgress.achievements.length > 0) {
      try {
        // Get the 5 most recent achievements
        const achievementIds = userProgress.achievements.slice(-5);
        recentAchievements = await Achievement.find({
          _id: { $in: achievementIds }
        }).select('name description type icon xpValue');
      } catch (error) {
        console.error('Error fetching achievements:', error);
        // Continue execution even if achievement fetching fails
      }
    }
    
    // Format XP history into a summarized view
    const xpHistorySummary = userProgress.xpHistory
      ? summarizeXpHistory(userProgress.xpHistory)
      : [];
    
    // Calculate level information
    const nextLevelXp = userProgress.getNextLevelXp();
    const xpToNextLevel = userProgress.getXpToNextLevel();
    const progressToNextLevel = Math.floor(
      ((userProgress.totalXp - (nextLevelXp - xpToNextLevel)) / xpToNextLevel) * 100
    );
    
    // Format the response with comprehensive progress data
    const formattedProgress = {
      user: {
        id: userProgress.userId,
      },
      level: {
        current: userProgress.level,
        xp: userProgress.totalXp,
        nextLevelXp,
        xpToNextLevel,
        progressPercent: progressToNextLevel
      },
      categories: {
        core: {
          level: userProgress.categoryProgress.core.level,
          xp: userProgress.categoryXp.core,
          totalExercisesUnlocked: userProgress.categoryProgress.core.unlockedExercises.length
        },
        push: {
          level: userProgress.categoryProgress.push.level,
          xp: userProgress.categoryXp.push,
          totalExercisesUnlocked: userProgress.categoryProgress.push.unlockedExercises.length
        },
        pull: {
          level: userProgress.categoryProgress.pull.level,
          xp: userProgress.categoryXp.pull,
          totalExercisesUnlocked: userProgress.categoryProgress.pull.unlockedExercises.length
        },
        legs: {
          level: userProgress.categoryProgress.legs.level,
          xp: userProgress.categoryXp.legs,
          totalExercisesUnlocked: userProgress.categoryProgress.legs.unlockedExercises.length
        }
      },
      achievements: {
        total: userProgress.achievements.length,
        recent: recentAchievements
      },
      history: {
        summary: xpHistorySummary,
        lastUpdated: userProgress.lastUpdated || userProgress.updatedAt
      }
    };
    
    return apiResponse(formattedProgress);
  } catch (error) {
    return handleApiError(error, 'Error retrieving user progress');
  }
}

/**
 * POST /api/progress
 * 
 * Updates user progress by adding XP or achievements.
 * 
 * Required fields:
 * - action: 'add_xp' | 'award_achievement'
 * 
 * For add_xp:
 * - amount: number - XP to award
 * - source: string - where the XP came from
 * - category?: 'core' | 'push' | 'pull' | 'legs' - optional category
 * - description?: string - optional description
 * 
 * For award_achievement:
 * - achievementId: string - ID of the achievement to award
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // Require authentication in production
    if (!session && process.env.NODE_ENV === 'production') {
      return apiError('Authentication required', 401);
    }
    
    const userId = session?.user?.id || '000000000000000000000000'; // Mock ID for development
    let userObjectId: Types.ObjectId;
    
    try {
      userObjectId = new Types.ObjectId(userId);
    } catch (error) {
      return apiError('Invalid user ID', 400);
    }
    
    // Parse request body
    const requestData = await req.json();
    const { action } = requestData;
    
    if (!action) {
      return apiError('Missing required field: action', 400);
    }
    
    // Get or create user progress
    let userProgress = await UserProgress.findOne({ userId: userObjectId });
    if (!userProgress) {
      try {
        userProgress = await UserProgress.createInitialProgress(userObjectId);
      } catch (error) {
        return handleApiError(error, 'Failed to create initial progress record');
      }
    }
    
    // Handle different actions
    if (action === 'add_xp') {
      return await handleAddXp(userProgress, requestData);
    } else if (action === 'award_achievement') {
      return await handleAwardAchievement(userProgress, requestData);
    } else {
      return apiError(`Unsupported action: ${action}`, 400);
    }
  } catch (error) {
    return handleApiError(error, 'Error updating user progress');
  }
}

/**
 * Helper function to add XP to user progress
 */
async function handleAddXp(userProgress: any, data: any) {
  const { amount, source, category, description } = data;
  
  // Validate required fields
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return apiError('XP amount must be a positive number', 400);
  }
  
  if (!source || typeof source !== 'string') {
    return apiError('Source is required and must be a string', 400);
  }
  
  // Add XP and check for level up
  try {
    const leveledUp = await userProgress.addXp(
      amount,
      source,
      category,
      description || ''
    );
    
    const response = {
      success: true,
      leveledUp,
      level: userProgress.level,
      totalXp: userProgress.totalXp,
      xpToNextLevel: userProgress.getXpToNextLevel()
    };
    
    if (category) {
      response[category] = {
        level: userProgress.categoryProgress[category].level,
        xp: userProgress.categoryXp[category]
      };
    }
    
    return apiResponse(
      response,
      leveledUp ? `You leveled up to level ${userProgress.level}!` : `Added ${amount} XP!`
    );
  } catch (error) {
    return handleApiError(error, 'Failed to add XP');
  }
}

/**
 * Helper function to award an achievement to user progress
 */
async function handleAwardAchievement(userProgress: any, data: any) {
  const { achievementId } = data;
  
  // Validate achievement ID
  if (!achievementId) {
    return apiError('Achievement ID is required', 400);
  }
  
  let achievementObjectId: Types.ObjectId;
  try {
    achievementObjectId = new Types.ObjectId(achievementId);
  } catch (error) {
    return apiError('Invalid achievement ID', 400);
  }
  
  // Check if achievement exists
  const achievement = await Achievement.findById(achievementObjectId);
  if (!achievement) {
    return apiError('Achievement not found', 404);
  }
  
  // Check if user already has this achievement
  if (userProgress.achievements.includes(achievementObjectId) || 
      userProgress.achievements.some(id => id.toString() === achievementId)) {
    return apiResponse(
      { alreadyAwarded: true },
      'Achievement already awarded',
      200
    );
  }
  
  // Award the achievement
  try {
    userProgress.achievements.push(achievementObjectId);
    
    // Also award XP for the achievement if it has an XP value
    if (achievement.xpValue > 0) {
      await userProgress.addXp(
        achievement.xpValue,
        'achievement',
        undefined,
        `Awarded for achievement: ${achievement.name}`
      );
    } else {
      // If no XP to add, still need to save
      userProgress.lastUpdated = new Date();
      await userProgress.save();
    }
    
    return apiResponse(
      {
        achievement: {
          id: achievement._id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          xpValue: achievement.xpValue
        },
        totalAchievements: userProgress.achievements.length,
        level: userProgress.level,
        totalXp: userProgress.totalXp
      },
      `Achievement unlocked: ${achievement.name}`
    );
  } catch (error) {
    return handleApiError(error, 'Failed to award achievement');
  }
}

/**
 * Helper function to summarize XP history into a more compact format
 */
function summarizeXpHistory(xpHistory: any[]) {
  if (!xpHistory || xpHistory.length === 0) {
    return [];
  }
  
  // Get the most recent 10 entries
  const recentEntries = xpHistory.slice(-10);
  
  // Group by source and date (day)
  const groupedEntries = recentEntries.reduce((acc, entry) => {
    const date = new Date(entry.date);
    const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const sourceKey = entry.source;
    
    const key = `${dateKey}-${sourceKey}`;
    
    if (!acc[key]) {
      acc[key] = {
        date: date,
        source: sourceKey,
        totalAmount: 0,
        category: entry.category,
        entries: 0,
      };
    }
    
    acc[key].totalAmount += entry.amount;
    acc[key].entries += 1;
    
    return acc;
  }, {});
  
  // Convert to array and sort by date
  return Object.values(groupedEntries)
    .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
    .map((item: any) => ({
      date: item.date.toISOString(),
      source: item.source,
      totalAmount: item.totalAmount,
      category: item.category,
      entries: item.entries
    }));
}