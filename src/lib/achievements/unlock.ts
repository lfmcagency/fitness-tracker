import { Types } from 'mongoose';
import UserProgress from '@/models/UserProgress';
import { IUserProgress } from '@/types/models/progress';
import { HydratedDocument } from 'mongoose';

/**
 * Result from unlocking achievements
 */
export interface UnlockResult {
  unlockedCount: number;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    xpReward: number;
  }>;
}

/**
 * Milestone definitions for task streaks
 */
const STREAK_MILESTONES = [
  { streak: 7, achievementId: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day workout streak', xpReward: 70 },
  { streak: 30, achievementId: 'streak_30', title: 'Monthly Devotion', description: 'Maintain a 30-day workout streak', xpReward: 300 },
] as const;

/**
 * Check task streak milestones and unlock achievements
 * Called from task completion API when streak is recalculated
 */
export async function checkTaskStreakMilestones(
  userId: string | Types.ObjectId,
  currentStreak: number
): Promise<UnlockResult> {
  console.log(`🏆 [UNLOCK] Checking streak milestones for user ${userId}, streak: ${currentStreak}`);
  
  // Find milestones that match the current streak
  const hitMilestones = STREAK_MILESTONES.filter(milestone => milestone.streak === currentStreak);
  
  if (hitMilestones.length === 0) {
    console.log(`📊 [UNLOCK] No milestones hit for streak ${currentStreak}`);
    return { unlockedCount: 0, achievements: [] };
  }
  
  console.log(`🎯 [UNLOCK] Hit ${hitMilestones.length} milestone(s):`, hitMilestones.map(m => m.achievementId));
  
  const result: UnlockResult = {
    unlockedCount: 0,
    achievements: []
  };
  
  // Unlock each milestone achievement
  for (const milestone of hitMilestones) {
    const unlocked = await unlockAchievement(userId, milestone.achievementId);
    if (unlocked) {
      result.unlockedCount++;
      result.achievements.push({
        id: milestone.achievementId,
        title: milestone.title,
        description: milestone.description,
        xpReward: milestone.xpReward
      });
    }
  }
  
  console.log(`✅ [UNLOCK] Unlocked ${result.unlockedCount} new achievements`);
  return result;
}

/**
 * Unlock a specific achievement (add to pending state)
 * Core function that handles the unlock logic
 */
export async function unlockAchievement(
  userId: string | Types.ObjectId,
  achievementId: string
): Promise<boolean> {
  try {
    console.log(`🔓 [UNLOCK] Attempting to unlock achievement: ${achievementId} for user: ${userId}`);
    
    // Get user progress
    const userProgress = await getUserProgress(userId);
    if (!userProgress) {
      console.error(`❌ [UNLOCK] User progress not found for: ${userId}`);
      return false;
    }
    
    // Check if already claimed
    const alreadyClaimed = userProgress.achievements.some(id => id.toString() === achievementId);
    if (alreadyClaimed) {
      console.log(`ℹ️ [UNLOCK] Achievement ${achievementId} already claimed`);
      return false;
    }
    
    // Check if already pending
    if (userProgress.hasPendingAchievement(achievementId)) {
      console.log(`ℹ️ [UNLOCK] Achievement ${achievementId} already pending`);
      return false;
    }
    
    // Add to pending achievements
    await userProgress.addPendingAchievement(achievementId);
    
    console.log(`🎉 [UNLOCK] Achievement ${achievementId} added to pending!`);
    return true;
  } catch (error) {
    console.error(`💥 [UNLOCK] Error unlocking achievement ${achievementId}:`, error);
    return false;
  }
}

/**
 * Check level-based achievements and unlock them
 * Called when user levels up via XP system
 */
export async function checkLevelMilestones(
  userId: string | Types.ObjectId,
  newLevel: number
): Promise<UnlockResult> {
  console.log(`📈 [UNLOCK] Checking level milestones for user ${userId}, level: ${newLevel}`);
  
  const levelMilestones = [
    { level: 5, achievementId: 'global_level_5', title: 'Fitness Enthusiast', description: 'Reach level 5 in your fitness journey', xpReward: 50 },
    { level: 10, achievementId: 'global_level_10', title: 'Fitness Devotee', description: 'Reach level 10 in your fitness journey', xpReward: 100 },
    { level: 25, achievementId: 'global_level_25', title: 'Fitness Master', description: 'Reach level 25 in your fitness journey', xpReward: 250 },
  ];
  
  const hitMilestones = levelMilestones.filter(milestone => milestone.level === newLevel);
  
  if (hitMilestones.length === 0) {
    return { unlockedCount: 0, achievements: [] };
  }
  
  const result: UnlockResult = {
    unlockedCount: 0,
    achievements: []
  };
  
  for (const milestone of hitMilestones) {
    const unlocked = await unlockAchievement(userId, milestone.achievementId);
    if (unlocked) {
      result.unlockedCount++;
      result.achievements.push({
        id: milestone.achievementId,
        title: milestone.title,
        description: milestone.description,
        xpReward: milestone.xpReward
      });
    }
  }
  
  return result;
}

/**
 * Check XP-based achievements
 * Called when user gains XP
 */
export async function checkXpMilestones(
  userId: string | Types.ObjectId,
  totalXp: number
): Promise<UnlockResult> {
  const xpMilestones = [
    { xp: 1000, achievementId: 'xp_1000', title: 'Dedicated Athlete', description: 'Accumulate 1,000 XP in your fitness journey', xpReward: 100 },
    { xp: 5000, achievementId: 'xp_5000', title: 'Fitness Veteran', description: 'Accumulate 5,000 XP in your fitness journey', xpReward: 250 },
  ];
  
  const hitMilestones = xpMilestones.filter(milestone => totalXp >= milestone.xp);
  
  const result: UnlockResult = {
    unlockedCount: 0,
    achievements: []
  };
  
  // Only unlock if we just hit the milestone (not if we're way past it)
  for (const milestone of hitMilestones) {
    const unlocked = await unlockAchievement(userId, milestone.achievementId);
    if (unlocked) {
      result.unlockedCount++;
      result.achievements.push({
        id: milestone.achievementId,
        title: milestone.title,
        description: milestone.description,
        xpReward: milestone.xpReward
      });
    }
  }
  
  return result;
}

/**
 * Get user progress with error handling
 */
async function getUserProgress(userId: string | Types.ObjectId): Promise<HydratedDocument<IUserProgress> | null> {
  try {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return await UserProgress.findOne({ userId: userObjectId });
  } catch (error) {
    console.error('Error getting user progress:', error);
    return null;
  }
}

/**
 * Batch unlock multiple achievements
 * Useful for initial user setup or bulk operations
 */
export async function batchUnlockAchievements(
  userId: string | Types.ObjectId,
  achievementIds: string[]
): Promise<UnlockResult> {
  const result: UnlockResult = {
    unlockedCount: 0,
    achievements: []
  };
  
  for (const achievementId of achievementIds) {
    const unlocked = await unlockAchievement(userId, achievementId);
    if (unlocked) {
      result.unlockedCount++;
      // Would need to look up achievement details here
      // For now just track the ID
    }
  }
  
  return result;
}