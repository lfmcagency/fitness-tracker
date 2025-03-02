// Mark as dynamic
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import { getAuth } from '@/lib/auth';
import { ApiResponse } from '@/types';
import { getUserLevelInfo } from '@/lib/xp-manager';

/**
 * GET /api/user/progress
 * 
 * Returns the current user's XP and level information
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // If we have a user session, get the real user progress
    if (session?.user?.id) {
      const userProgress = await getUserLevelInfo(session.user.id);
      
      if (!userProgress) {
        return NextResponse.json<ApiResponse<any>>({ 
          success: true, 
          data: {
            totalXp: 0,
            level: 1,
            nextLevelXp: 100,
            xpToNextLevel: 100,
            categoryLevels: {
              core: 1,
              push: 1,
              pull: 1,
              legs: 1
            }
          },
          message: 'No progress found yet. This is your starting point!'
        });
      }
      
      return NextResponse.json<ApiResponse<any>>({ 
        success: true, 
        data: userProgress
      });
    }
    
    // Mock response for development
    const mockProgress = {
      totalXp: 375,
      level: 4,
      nextLevelXp: 499,
      xpToNextLevel: 124,
      categoryLevels: {
        core: 3,
        push: 5,
        pull: 2,
        legs: 4
      }
    };
    
    return NextResponse.json<ApiResponse<any>>({ 
      success: true, 
      data: mockProgress,
      message: 'Mock progress data returned' 
    });
  } catch (error) {
    console.error('Error in GET /api/user/progress:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error fetching user progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/user/progress
 * 
 * Awards XP to the user for a specific activity
 * 
 * Request body:
 * - amount: number - amount of XP to award
 * - source: string - source of the XP (e.g. 'workout', 'nutrition')
 * - category: 'core' | 'push' | 'pull' | 'legs' (optional) - category to award XP to
 * - description: string (optional) - description of the activity
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For development, allow access without authentication
    if (!session && process.env.NODE_ENV === 'production') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { amount, source, category, description } = await req.json();
    
    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid XP amount. Must be a positive number.'
      }, { status: 400 });
    }
    
    if (!source || typeof source !== 'string') {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid source. Must be a non-empty string.'
      }, { status: 400 });
    }
    
    // Validate category if provided
    if (category && !['core', 'push', 'pull', 'legs'].includes(category)) {
      return NextResponse.json<ApiResponse<never>>({ 
        success: false, 
        message: 'Invalid category. Must be one of: core, push, pull, legs'
      }, { status: 400 });
    }
    
    // If we have a user session, award real XP
    if (session?.user?.id) {
      const { awardXp } = await import('@/lib/xp-manager');
      
      const result = await awardXp(
        session.user.id,
        amount,
        source,
        category as ('core' | 'push' | 'pull' | 'legs' | undefined),
        description
      );
      
      return NextResponse.json<ApiResponse<any>>({ 
        success: true, 
        data: result,
        message: result.leveledUp 
          ? `Level up! You are now level ${result.newLevel}` 
          : `Awarded ${amount} XP! ${result.xpToNextLevel} XP until next level.`
      });
    }
    
    // Mock response for development
    const mockResult = {
      leveledUp: amount >= 50, // Pretend we level up if awarded 50+ XP
      previousLevel: 4,
      newLevel: amount >= 50 ? 5 : 4,
      currentXp: 375 + amount,
      xpToNextLevel: amount >= 50 ? 600 - (375 + amount) : 499 - (375 + amount)
    };
    
    return NextResponse.json<ApiResponse<any>>({ 
      success: true, 
      data: mockResult,
      message: mockResult.leveledUp 
        ? `Level up! You are now level ${mockResult.newLevel}` 
        : `Awarded ${amount} XP! ${mockResult.xpToNextLevel} XP until next level.`
    });
  } catch (error) {
    console.error('Error in POST /api/user/progress:', error);
    return NextResponse.json<ApiResponse<never>>({ 
      success: false, 
      message: 'Error awarding XP',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}