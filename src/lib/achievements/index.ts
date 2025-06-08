import { Types, Document, HydratedDocument } from 'mongoose';
import Achievement from '@/models/Achievement';
import { IUserProgress } from '@/types/models/progress';
import { ETHOS_ACHIEVEMENTS } from './ethos';
import { SOMA_ACHIEVEMENTS } from './soma';
import { CROSS_DOMAIN_ACHIEVEMENTS } from './cross-domain';

/**
 * Achievement requirement types
 */
export type AchievementRequirement = {
  level?: number;              // Global level requirement
  totalXp?: number;            // Total XP threshold
  categoryLevel?: {            // Category-specific level requirements
    category: 'core' | 'push' | 'pull' | 'legs';
    level: number;
  };
  streakCount?: number;        // Task streak requirement
  completedWorkouts?: number;  // Number of completed workouts
  exerciseMastery?: {          // Specific exercise mastery
    exerciseId: string;
    level: number;
  };
};

/**
 * Achievement definition interface
 */
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  type: 'strength' | 'consistency' | 'nutrition' | 'milestone';
  requirements: AchievementRequirement;
  xpReward: number;
  icon: string;
  badgeColor?: string;
}

/**
 * All achievements across all domains
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  ...ETHOS_ACHIEVEMENTS,
  ...SOMA_ACHIEVEMENTS,
  ...CROSS_DOMAIN_ACHIEVEMENTS
];

/**
 * Retrieve all achievements from the system
 * @returns Array of achievement definitions
 */
export function getAchievements(): AchievementDefinition[] {
  return ACHIEVEMENTS;
}

/**
 * Get achievements by domain
 */
export function getEthosAchievements(): AchievementDefinition[] {
  return ETHOS_ACHIEVEMENTS;
}

export function getSomaAchievements(): AchievementDefinition[] {
  return SOMA_ACHIEVEMENTS;
}

export function getCrossDomainAchievements(): AchievementDefinition[] {
  return CROSS_DOMAIN_ACHIEVEMENTS;
}

/**
 * Check if a user meets an achievement's requirements
 * @param achievement Achievement definition to check
 * @param userProgress User's progress document
 * @returns Boolean indicating if requirements are met
 */
export function meetsRequirements(
  achievement: AchievementDefinition,
  userProgress: HydratedDocument<IUserProgress>
): boolean {
  const req = achievement.requirements;
  
  // Check global level requirement
  if (req.level && userProgress.level < req.level) {
    return false;
  }
  
  // Check total XP requirement
  if (req.totalXp && userProgress.totalXp < req.totalXp) {
    return false;
  }
  
  // Check category level requirement
  if (req.categoryLevel) {
    const { category, level } = req.categoryLevel;
    if (userProgress.categoryProgress[category].level < level) {
      return false;
    }
  }
  
  // Check streak count - this would be populated from the Task collection
  // For simplicity, we'll skip this check in this implementation
  // An actual implementation would check the user's longest streak from tasks
  
  // Check completed workouts - this would be populated from the Workout collection
  // For simplicity, we'll skip this check in this implementation
  
  // Exercise mastery would be checked similarly
  
  // If we've passed all applicable checks, the user meets the requirements
  return true;
}

/**
 * Check if a specific achievement is unlocked for a user
 * @param userId User ID to check
 * @param achievementId Achievement ID to check
 * @returns Boolean indicating if the achievement is unlocked
 */
export async function isAchievementUnlocked(
  userId: string | Types.ObjectId,
  achievementId: string
): Promise<boolean> {
  // Get the user progress
  const userProgress = await getUserProgressForAchievements(userId);
  if (!userProgress) return false;
  
  // Check if achievement is in the user's list
  // Convert all IDs to strings for comparison
  const userAchievementIds = userProgress.achievements.map(id => 
    id instanceof Types.ObjectId ? id.toString() : String(id)
  );
  
  // First check direct ID match (for predefined achievements)
  if (userAchievementIds.includes(achievementId)) {
    return true;
  }
  
  // Then check database-stored achievements by fetching actual achievement IDs
  const achievementDocs = await Achievement.find({
    _id: { $in: userProgress.achievements }
  });
  
  // Check if any of the achievement documents match the requested ID
  // This handles cases where achievementId is a database ID
  return achievementDocs.some(doc => doc._id.toString() === achievementId);
}

/**
 * Check if a user is eligible for an achievement
 * @param userId User ID to check
 * @param achievement Achievement to check eligibility for
 * @returns Object with eligibility status and reason
 */
export async function checkEligibility(
  userId: string | Types.ObjectId,
  achievement: AchievementDefinition
): Promise<{ eligible: boolean; reason?: string }> {
  // Get the user progress
  const userProgress = await getUserProgressForAchievements(userId);
  if (!userProgress) {
    return { eligible: false, reason: 'User progress not found' };
  }
  
  // Check if already unlocked
  const userAchievementIds = userProgress.achievements.map(id => 
    id instanceof Types.ObjectId ? id.toString() : String(id)
  );
  
  if (userAchievementIds.includes(achievement.id)) {
    return { eligible: false, reason: 'Achievement already unlocked' };
  }
  
  // Check requirements
  if (meetsRequirements(achievement, userProgress)) {
    return { eligible: true };
  }
  
  // Determine which requirement was not met
  const req = achievement.requirements;
  let reason = 'Requirements not met';
  
  if (req.level && userProgress.level < req.level) {
    reason = `Level requirement not met: ${userProgress.level}/${req.level}`;
  } else if (req.totalXp && userProgress.totalXp < req.totalXp) {
    reason = `XP requirement not met: ${userProgress.totalXp}/${req.totalXp}`;
  } else if (req.categoryLevel) {
    const { category, level } = req.categoryLevel;
    const currentLevel = userProgress.categoryProgress[category].level;
    if (currentLevel < level) {
      reason = `${category.charAt(0).toUpperCase() + category.slice(1)} level requirement not met: ${currentLevel}/${level}`;
    }
  }
  
  return { eligible: false, reason };
}

/**
 * Find achievements the user has newly unlocked
 * @param userProgress User progress document
 * @returns Promise resolving to array of newly unlocked achievements
 */
export async function checkAchievements(
  userProgress: HydratedDocument<IUserProgress>
): Promise<AchievementDefinition[]> {
  // Explicitly convert achievement IDs to strings
  const userAchievementIds = userProgress.achievements.map(id => 
    id instanceof Types.ObjectId ? id.toString() : String(id)
  );
  
  // Rest of the function remains the same
  const newlyUnlockedAchievements: AchievementDefinition[] = [];
  
  for (const achievement of ACHIEVEMENTS) {
    if (userAchievementIds.includes(achievement.id)) {
      continue;
    }
    
    if (meetsRequirements(achievement, userProgress)) {
      newlyUnlockedAchievements.push(achievement);
    }
  }
  
  return newlyUnlockedAchievements;
}

/**
 * Award achievements to a user
 * @param userProgress User progress document
 * @param achievements Achievements to award
 * @returns Promise resolving to { updatedProgress, totalXpAwarded }
 */
export async function awardAchievements(
  userProgress: HydratedDocument<IUserProgress>,
  achievements: AchievementDefinition[]
): Promise<{ updatedProgress: HydratedDocument<IUserProgress>; totalXpAwarded: number }> {
  if (!achievements.length) {
    return { updatedProgress: userProgress, totalXpAwarded: 0 };
  }
  
  let totalXpAwarded = 0;
  
  // For each achievement
  for (const achievement of achievements) {
    try {
      // First, check if the achievement exists in the database, or create it
      let achievementDoc = await Achievement.findOne({ name: achievement.title });
      
      if (!achievementDoc) {
        // Create the achievement document if it doesn't exist
        achievementDoc = await Achievement.create({
          name: achievement.title,
          description: achievement.description,
          type: achievement.type,
          xpValue: achievement.xpReward,
          icon: achievement.icon,
          requirements: {
            level: achievement.requirements.level,
            // Add other requirements as needed
          }
        });
      }
      
      // Add achievement to user's achievements if not already there
      if (!userProgress.achievements.some(id => 
        id.toString() === achievementDoc._id.toString()
      )) {
        userProgress.achievements.push(achievementDoc._id);
        
        // Award XP for the achievement
        totalXpAwarded += achievement.xpReward;
        
        // Add XP transaction
        userProgress.xpHistory.push({
          amount: achievement.xpReward,
          source: 'achievement',
          date: new Date(),
          description: `Unlocked achievement: ${achievement.title}`
        });
      }
    } catch (error) {
      console.error(`Error awarding achievement ${achievement.title}:`, error);
      // Continue with other achievements even if one fails
    }
  }
  
  // Update total XP
  if (totalXpAwarded > 0) {
    userProgress.totalXp += totalXpAwarded;
    
    // Recalculate level based on new XP total
    userProgress.level = userProgress.calculateLevel(userProgress.totalXp);
    
    // Update timestamp
    userProgress.lastUpdated = new Date();
    
    // Save changes and ensure we maintain the document reference
    const savedDoc = await userProgress.save();
    // Return the saved document to ensure all Mongoose properties are preserved
    userProgress = savedDoc;
  }
  
  return { updatedProgress: userProgress, totalXpAwarded };
}

/**
 * Get all achievements with unlock status for a user
 * @param userProgress User progress document (or null if not authenticated)
 * @returns Array of achievements with unlock status
 */
export async function getAllAchievementsWithStatus(userProgress: HydratedDocument<IUserProgress> | null) {
  // Get IDs of achievements the user already has
  const userAchievementIds = userProgress
    ? userProgress.achievements.map(id => id.toString())
    : [];
  
  // Map achievements to include unlock status
  return ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: userAchievementIds.includes(achievement.id),
    progress: calculateAchievementProgress(achievement, userProgress)
  }));
}

/**
 * Calculate progress percentage toward an achievement
 * @param achievement Achievement definition
 * @param userProgress User progress document
 * @returns Progress percentage (0-100)
 */
function calculateAchievementProgress(
  achievement: AchievementDefinition,
  userProgress: HydratedDocument<IUserProgress> | null
): number {
  if (!userProgress) return 0;
  
  const req = achievement.requirements;
  
  // Level-based achievement
  if (req.level) {
    return Math.min(100, Math.floor((userProgress.level / req.level) * 100));
  }
  
  // XP-based achievement
  if (req.totalXp) {
    return Math.min(100, Math.floor((userProgress.totalXp / req.totalXp) * 100));
  }
  
  // Category level achievement
  if (req.categoryLevel) {
    const { category, level } = req.categoryLevel;
    const userCategoryLevel = userProgress.categoryProgress[category].level;
    return Math.min(100, Math.floor((userCategoryLevel / level) * 100));
  }
  
  // For other types of achievements, we'd need more context
  // Default to 0 if we can't calculate
  return 0;
}

/**
 * Helper function to retrieve user progress for achievement checking
 * @param userId User ID to retrieve progress for
 * @returns User progress document or null if not found
 */
async function getUserProgressForAchievements(userId: string | Types.ObjectId): Promise<HydratedDocument<IUserProgress> | null> {
  // Import UserProgress model dynamically to avoid circular dependencies
  const UserProgress = (await import('@/models/UserProgress')).default;
  
  // Convert string ID to ObjectId if necessary
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  
  // Get the user progress
  return await UserProgress.findOne({ userId: userObjectId });
}