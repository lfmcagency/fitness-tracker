import { IAchievement } from '@/types/models/achievement';
import { AchievementData } from '@/types/api/achievementResponses';
import { AchievementDefinition } from '@/lib/achievements';

/**
 * Converts an Achievement document to API response format
 */
export function convertAchievementToResponse(
  achievement: IAchievement, 
  options?: { 
    unlocked?: boolean, 
    progress?: number,
    unlockedAt?: Date 
  }
): AchievementData {
  return {
    id: achievement._id.toString(),
    title: achievement.name,
    description: achievement.description,
    type: achievement.type,
    xpReward: achievement.xpValue,
    icon: achievement.icon || 'award',
    requirements: {
      level: achievement.requirements?.level,
      exerciseId: achievement.requirements?.exerciseId?.toString(),
      reps: achievement.requirements?.reps,
      sets: achievement.requirements?.sets,
      streak: achievement.requirements?.streak
    },
    unlocked: options?.unlocked || false,
    progress: options?.progress,
    unlockedAt: options?.unlockedAt ? options.unlockedAt.toISOString() : undefined
  };
}

/**
 * Converts an in-memory achievement definition to API response format
 */
export function convertDefinitionToResponse(
  achievement: AchievementDefinition,
  options?: { 
    unlocked?: boolean, 
    progress?: number
  }
): AchievementData {
  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    type: achievement.type,
    xpReward: achievement.xpReward,
    icon: achievement.icon || 'award',
    requirements: {
      level: achievement.requirements.level,
      // Include other requirements as needed
    },
    unlocked: options?.unlocked || false,
    progress: options?.progress
  };
}

/**
 * Groups achievements by type for API response
 */
export function groupAchievementsByType(
  achievements: AchievementData[]
): Record<string, AchievementData[]> {
  return achievements.reduce((groups, achievement) => {
    const type = achievement.type || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(achievement);
    return groups;
  }, {} as Record<string, AchievementData[]>);
}