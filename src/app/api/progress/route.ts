export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongodb';
import UserProgress from '@/models/UserProgress';
import { getAuth } from '@/lib/auth';
import { apiResponse, handleApiError } from '@/lib/api-utils';

// GET - Fetch user progress
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For demo purposes, allow access without auth
    const userId = session?.user?.id || '000000000000000000000000';
    
    // Fetch or create user progress
    let userProgress = await UserProgress.findOne({ userId });
    
    if (!userProgress) {
      // Create initial progress for new users
      userProgress = await UserProgress.create({
        userId,
        globalLevel: 1,
        globalXp: 0,
        categoryProgress: {
          core: { level: 1, xp: 0, unlockedExercises: [] },
          push: { level: 1, xp: 0, unlockedExercises: [] },
          pull: { level: 1, xp: 0, unlockedExercises: [] },
          legs: { level: 1, xp: 0, unlockedExercises: [] }
        },
        achievements: []
      });
    }
    
    return apiResponse(userProgress);
  } catch (error) {
    return handleApiError(error, 'Error fetching user progress');
  }
}

// POST - Update user progress (add XP, etc.)
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getAuth();
    
    // For demo purposes, allow access without auth
    const userId = session?.user?.id || '000000000000000000000000';
    
    const { xp, category, source } = await req.json();
    
    // Validate xp is a positive number
    if (typeof xp !== 'number' || xp <= 0) {
      return apiResponse({ success: false }, 'XP must be a positive number', 400);
    }
    
    // Fetch user progress
    let userProgress = await UserProgress.findOne({ userId });
    
    if (!userProgress) {
      // Create initial progress for new users
      userProgress = await UserProgress.create({
        userId,
        globalLevel: 1,
        globalXp: 0,
        categoryProgress: {
          core: { level: 1, xp: 0, unlockedExercises: [] },
          push: { level: 1, xp: 0, unlockedExercises: [] },
          pull: { level: 1, xp: 0, unlockedExercises: [] },
          legs: { level: 1, xp: 0, unlockedExercises: [] }
        },
        achievements: []
      });
    }
    
    // Add XP to global
    userProgress.globalXp += xp;
    
    // Calculate new global level
    // Using a formula: level = 1 + floor(globalXp / 100)^0.8
    // This creates a progression curve that slows down at higher levels
    userProgress.globalLevel = Math.floor(1 + Math.pow(userProgress.globalXp / 100, 0.8));
    
    // If category is specified, add XP to that category too
    if (category && ['core', 'push', 'pull', 'legs'].includes(category)) {
      userProgress.categoryProgress[category].xp += xp;
      
      // Calculate new category level
      // Simpler formula for category levels
      userProgress.categoryProgress[category].level = 
        Math.floor(1 + Math.pow(userProgress.categoryProgress[category].xp / 50, 0.7));
    }
    
    // Save progress
    await userProgress.save();
    
    return apiResponse({
      globalXp: userProgress.globalXp,
      globalLevel: userProgress.globalLevel,
      category: category ? {
        name: category,
        xp: userProgress.categoryProgress[category].xp,
        level: userProgress.categoryProgress[category].level
      } : null
    });
  } catch (error) {
    return handleApiError(error, 'Error updating user progress');
  }
}