import { Types, Document, HydratedDocument } from 'mongoose';
import Achievement from '@/models/Achievement';
import { IUserProgress } from '@/models/UserProgress';

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
 * Available achievements in the system
 */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Global level achievements
  {
    id: 'global_level_5',
    title: 'Fitness Enthusiast',
    description: 'Reach level 5 in your fitness journey',
    type: 'milestone',
    requirements: {
      level: 5
    },
    xpReward: 50,
    icon: 'award'
  },
  {
    id: 'global_level_10',
    title: 'Fitness Devotee',
    description: 'Reach level 10 in your fitness journey',
    type: 'milestone',
    requirements: {
      level: 10
    },
    xpReward: 100,
    icon: 'award'
  },
  {
    id: 'global_level_25',
    title: 'Fitness Master',
    description: 'Reach level 25 in your fitness journey',
    type: 'milestone',
    requirements: {
      level: 25
    },
    xpReward: 250,
    icon: 'award'
  },
  
  // XP milestones
  {
    id: 'xp_1000',
    title: 'Dedicated Athlete',
    description: 'Accumulate 1,000 XP in your fitness journey',
    type: 'milestone',
    requirements: {
      totalXp: 1000
    },
    xpReward: 100,
    icon: 'zap'
  },
  {
    id: 'xp_5000',
    title: 'Fitness Veteran',
    description: 'Accumulate 5,000 XP in your fitness journey',
    type: 'milestone',
    requirements: {
      totalXp: 5000
    },
    xpReward: 250,
    icon: 'zap'
  },
  
  // Category-specific achievements
  {
    id: 'core_level_5',
    title: 'Core Strength',
    description: 'Reach level 5 in core exercises',
    type: 'strength',
    requirements: {
      categoryLevel: {
        category: 'core',
        level: 5
      }
    },
    xpReward: 50,
    icon: 'disc',
    badgeColor: 'bg-blue-500'
  },
  {
    id: 'push_level_5',
    title: 'Push Power',
    description: 'Reach level 5 in pushing exercises',
    type: 'strength',
    requirements: {
      categoryLevel: {
        category: 'push',
        level: 5
      }
    },
    xpReward: 50,
    icon: 'arrow-up',
    badgeColor: 'bg-red-500'
  },
  {
    id: 'pull_level_5',
    title: 'Pull Proficiency',
    description: 'Reach level 5 in pulling exercises',
    type: 'strength',
    requirements: {
      categoryLevel: {
        category: 'pull',
        level: 5
      }
    },
    xpReward: 50,
    icon: 'arrow-down',
    badgeColor: 'bg-green-500'
  },
  {
    id: 'legs_level_5',
    title: 'Leg Legend',
    description: 'Reach level 5 in leg exercises',
    type: 'strength',
    requirements: {
      categoryLevel: {
        category: 'legs',
        level: 5
      }
    },
    xpReward: 50,
    icon: 'activity',
    badgeColor: 'bg-purple-500'
  },
  
  // Consistency achievements
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    type: 'consistency',
    requirements: {
      streakCount: 7
    },
    xpReward: 70,
    icon: 'calendar'
  },
  {
    id: 'streak_30',
    title: 'Monthly Devotion',
    description: 'Maintain a 30-day workout streak',
    type: 'consistency',
    requirements: {
      streakCount: 30
    },
    xpReward: 300,
    icon: 'calendar'
  },
  
  // Workout achievements
  {
    id: 'workouts_10',
    title: 'Workout Beginner',
    description: 'Complete 10 workouts',
    type: 'consistency',
    requirements: {
      completedWorkouts: 10
    },
    xpReward: 50,
    icon: 'list-checks'
  },
  {
    id: 'workouts_50',
    title: 'Workout Regular',
    description: 'Complete 50 workouts',
    type: 'consistency',
    requirements: {
      completedWorkouts: 50
    },
    xpReward: 100,
    icon: 'list-checks'
  },
  {
    id: 'workouts_100',
    title: 'Workout Expert',
    description: 'Complete 100 workouts',
    type: 'consistency',
    requirements: {
      completedWorkouts: 100
    },
    xpReward: 200,
    icon: 'list-checks'
  },
  
  // Nutrition achievements
  {
    id: 'nutrition_streak_7',
    title: 'Nutrition Aware',
    description: 'Track your nutrition for 7 consecutive days',
    type: 'nutrition',
    requirements: {
      streakCount: 7
    },
    xpReward: 70,
    icon: 'utensils'
  },
  {
    id: 'nutrition_streak_30',
    title: 'Nutrition Master',
    description: 'Track your nutrition for 30 consecutive days',
    type: 'nutrition',
    requirements: {
      streakCount: 30
    },
    xpReward: 150,
    icon: 'utensils'
  }
];

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
 * Find achievements the user has newly unlocked
 * @param userProgress User progress document
 * @returns Promise resolving to array of newly unlocked achievements
 */
export async function checkAchievements(
  userProgress: HydratedDocument<IUserProgress>
): Promise<AchievementDefinition[]> {
  // First, get IDs of achievements the user already has
  const userAchievementIds = userProgress.achievements.map(id => 
    id instanceof Types.ObjectId ? id.toString() : id.toString()
  );
  
  // Check each achievement to see if:
  // 1. User doesn't already have it
  // 2. User meets the requirements
  const newlyUnlockedAchievements: AchievementDefinition[] = [];
  
  // Check predefined achievements
  for (const achievement of ACHIEVEMENTS) {
    // Skip if user already has this achievement
    if (userAchievementIds.includes(achievement.id)) {
      continue;
    }
    
    // Check if user meets requirements
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