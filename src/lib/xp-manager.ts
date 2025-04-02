// src/lib/xp-manager.ts
// Assuming previous code for XP_REWARDS, awardXp, etc. is correct
import { Types, HydratedDocument } from 'mongoose';
import UserProgress from '@/models/UserProgress'; // Assuming model exists
import { checkAchievements, awardAchievements } from './achievements'; // Assuming these exist
import { checkCategoryMilestone, ProgressCategory, ProgressCategoryEnum } from './category-progress'; // Assuming these exist
import { IUserProgress } from '@/types/models/progress'; // Assuming this type exists


export const XP_REWARDS = { /* ... your rewards ... */ };

export interface XpAwardResult { /* ... structure ... */ }

export async function awardXp(
  userId: string | Types.ObjectId,
  amount: number,
  source: string,
  category?: ProgressCategory,
  description?: string
): Promise<XpAwardResult> {
  // ... Implementation of awardXp logic ...
  // This should fetch userProgress, add XP, check level up, check achievements,
  // check category progress, and return the XpAwardResult structure.
  // Using placeholder implementation:
   console.log(`Awarding ${amount} XP to ${userId} for ${source}`);
   const userProgress = await getUserProgress(Types.ObjectId.createFromHexString(userId.toString()));
   const previousXp = userProgress.totalXp;
   const previousLevel = userProgress.level;
   await userProgress.addXp(amount, source, category, description); // Assuming addXp method exists and saves
   const leveledUp = userProgress.level > previousLevel;
   const nextLevelInfo = calculateLevelDetails(userProgress.totalXp);

   return {
       previousXp,
       totalXp: userProgress.totalXp,
       xpAdded: amount,
       previousLevel,
       currentLevel: userProgress.level,
       leveledUp,
       xpToNextLevel: nextLevelInfo.nextLevelXpThreshold - userProgress.totalXp,
       progressPercent: Math.min(100, Math.max(0, Math.floor((nextLevelInfo.xpInCurrentLevel / (nextLevelInfo.nextLevelXpThreshold - nextLevelInfo.xpAtStartOfLevel)) * 100))),
       // Add achievements/category info if implemented
   };
}

async function getUserProgress(userId: Types.ObjectId): Promise<HydratedDocument<IUserProgress>> {
   let userProgress = await UserProgress.findOne({ userId });
   if (!userProgress) {
       userProgress = await UserProgress.createInitialProgress(userId); // Assuming this method exists
   }
   if (!userProgress) {
       throw new Error(`Failed to get or create user progress for ${userId}`);
   }
   return userProgress;
}
// ... checkAndAwardAchievements implementation ...


// --- Exported Level Calculation Details ---
// Use this if you need detailed breakdown outside the manager
export function calculateLevelDetails(xp: number): { level: number; xpInCurrentLevel: number; xpToNextLevel: number; xpAtStartOfLevel: number; nextLevelXpThreshold: number } {
    // Replace with your actual XP logic
    const level = Math.floor(Math.pow(xp / 100, 0.5)) + 1;
    const xpAtStartOfLevel = 100 * Math.pow(level - 1, 2);
    const nextLevelXpThreshold = 100 * Math.pow(level, 2);
    const xpNeededForLevelRange = nextLevelXpThreshold - xpAtStartOfLevel; // XP needed for this level range
    const xpInCurrentLevel = xp - xpAtStartOfLevel;
    return { level, xpInCurrentLevel, xpToNextLevel: xpNeededForLevelRange, xpAtStartOfLevel, nextLevelXpThreshold };
}

// --- Exported Function to get simplified level info ---
export async function getUserLevelInfo(userId: string | Types.ObjectId) {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  let userProgress = await UserProgress.findOne({ userId: userObjectId });

  if (!userProgress) {
       userProgress = await UserProgress.createInitialProgress(userObjectId);
       if (!userProgress) return null; // Return null if creation fails
  }

  const details = calculateLevelDetails(userProgress.totalXp);

  return {
    totalXp: userProgress.totalXp,
    level: details.level,
    nextLevelXpThreshold: details.nextLevelXpThreshold, // XP threshold for next level
    xpRemainingToNextLevel: details.nextLevelXpThreshold - userProgress.totalXp, // Actual XP remaining
    xpInCurrentLevel: details.xpInCurrentLevel, // XP earned within current level
    xpForCurrentLevelRange: details.xpToNextLevel, // Total XP needed for this level range
    progressPercent: Math.min(100, Math.max(0, Math.floor((details.xpInCurrentLevel / details.xpToNextLevel) * 100))), // XP within current level range
  };
}