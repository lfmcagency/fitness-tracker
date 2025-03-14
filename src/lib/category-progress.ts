// src/lib/category-progress.ts
import { XpTransaction } from '@/models/UserProgress';
import { IUserProgress } from '@/types/models/progress';
import { AchievementDefinition, ACHIEVEMENTS } from './achievements';
import { HydratedDocument } from 'mongoose';

// Define the runtime enum for categories with lowercase values
export enum ProgressCategoryEnum {
  core = 'core',
  push = 'push',
  pull = 'pull',
  legs = 'legs',
}

// Define the type based on the enum values
export type ProgressCategory = keyof typeof ProgressCategoryEnum;

// Array of valid categories for runtime checks
export const VALID_CATEGORIES = Object.values(ProgressCategoryEnum) as ProgressCategory[];

/**
 * Type guard to check if a string is a valid category
 * @param category String to check
 * @returns True if the string is a valid category
 */
export function isValidCategory(category: string): category is ProgressCategory {
  return VALID_CATEGORIES.includes(category as ProgressCategory);
}

// Category metadata for UI display and business logic
export const CATEGORY_METADATA: Record<ProgressCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
  primaryMuscles: string[];
  scaling: number;
}> = {
  [ProgressCategoryEnum.core]: {
    name: 'Core',
    description: 'Abdominal and lower back exercises',
    icon: 'disc',
    color: 'bg-blue-500',
    primaryMuscles: ['Rectus Abdominis', 'Obliques', 'Transverse Abdominis', 'Erector Spinae'],
    scaling: 1.0,
  },
  [ProgressCategoryEnum.push]: {
    name: 'Push',
    description: 'Pushing movements involving chest, shoulders, and triceps',
    icon: 'arrow-up',
    color: 'bg-red-500',
    primaryMuscles: ['Pectoralis', 'Deltoids', 'Triceps'],
    scaling: 1.0,
  },
  [ProgressCategoryEnum.pull]: {
    name: 'Pull',
    description: 'Pulling movements involving back and biceps',
    icon: 'arrow-down',
    color: 'bg-green-500',
    primaryMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Trapezius', 'Biceps'],
    scaling: 1.0,
  },
  [ProgressCategoryEnum.legs]: {
    name: 'Legs',
    description: 'Lower body exercises involving quadriceps, hamstrings, and calves',
    icon: 'activity',
    color: 'bg-purple-500',
    primaryMuscles: ['Quadriceps', 'Hamstrings', 'Gluteus', 'Calves'],
    scaling: 1.1,
  },
};

// Milestone XP thresholds for categories
export const CATEGORY_MILESTONES = {
  BEGINNER: 500,
  INTERMEDIATE: 1500,
  ADVANCED: 3000,
  EXPERT: 6000,
  MASTER: 10000,
};

// Category ranks based on XP thresholds
export const CATEGORY_RANKS = [
  { name: 'Novice', threshold: 0, icon: 'user' },
  { name: 'Beginner', threshold: CATEGORY_MILESTONES.BEGINNER, icon: 'award' },
  { name: 'Intermediate', threshold: CATEGORY_MILESTONES.INTERMEDIATE, icon: 'shield' },
  { name: 'Advanced', threshold: CATEGORY_MILESTONES.ADVANCED, icon: 'star' },
  { name: 'Expert', threshold: CATEGORY_MILESTONES.EXPERT, icon: 'crown' },
  { name: 'Master', threshold: CATEGORY_MILESTONES.MASTER, icon: 'award-filled' },
];

/**
 * Get the current rank for a specific amount of category XP
 * @param xp The XP amount to calculate rank for
 * @returns The user's rank information
 */
export function getCategoryRank(xp: number) {
  for (let i = CATEGORY_RANKS.length - 1; i >= 0; i--) {
    if (xp >= CATEGORY_RANKS[i].threshold) {
      const currentRank = CATEGORY_RANKS[i];
      const nextRank = i < CATEGORY_RANKS.length - 1 ? CATEGORY_RANKS[i + 1] : null;

      let progressPercent = 100;
      let xpToNextRank = 0;

      if (nextRank) {
        const rangeSize = nextRank.threshold - currentRank.threshold;
        const progress = xp - currentRank.threshold;
        progressPercent = Math.min(100, Math.floor((progress / rangeSize) * 100));
        xpToNextRank = nextRank.threshold - xp;
      }

      return {
        rank: currentRank.name,
        icon: currentRank.icon,
        nextRank: nextRank ? nextRank.name : null,
        progressPercent,
        xpToNextRank,
      };
    }
  }

  return {
    rank: CATEGORY_RANKS[0].name,
    icon: CATEGORY_RANKS[0].icon,
    nextRank: CATEGORY_RANKS[1].name,
    progressPercent: 0,
    xpToNextRank: CATEGORY_RANKS[1].threshold,
  };
}

/**
 * Get achievements specific to a category
 * @param category The category to get achievements for
 * @param userProgress The user's progress document
 * @returns Array of category achievements with unlock status
 */
export function getCategoryAchievements(category: ProgressCategory, userProgress: IUserProgress | null) {
  const categoryAchievements = ACHIEVEMENTS.filter((achievement) => {
    if (achievement.requirements.categoryLevel) {
      return achievement.requirements.categoryLevel.category === category;
    }
    return false;
  });

  if (!userProgress) {
    return categoryAchievements.map((achievement) => ({
      ...achievement,
      unlocked: false,
      progress: 0,
    }));
  }

  const userAchievementIds = userProgress.achievements.map((id) => id.toString());

  return categoryAchievements.map((achievement) => {
    const unlocked = userAchievementIds.includes(achievement.id);

    let progress = 0;
    if (achievement.requirements.categoryLevel) {
      const { category: achievementCategory, level } = achievement.requirements.categoryLevel;
      const userCategoryLevel = userProgress.categoryProgress[achievementCategory].level;
      progress = Math.min(100, Math.floor((userCategoryLevel / level) * 100));
    }

    return {
      ...achievement,
      unlocked,
      progress,
    };
  });
}

/**
 * Calculate key statistics for a specific category
 * @param category The category to calculate stats for
 * @param userProgress The user's progress document
 * @returns Category statistics
 */
export function getCategoryStatistics(category: ProgressCategory, userProgress: IUserProgress) {
  const categoryXp = userProgress.categoryXp[category];
  const categoryLevel = userProgress.categoryProgress[category].level;
  const rank = getCategoryRank(categoryXp);

  const percentOfTotal = userProgress.totalXp > 0
    ? Math.round((categoryXp / userProgress.totalXp) * 100)
    : 0;

  const recentActivity = getRecentCategoryActivity(category, userProgress.xpHistory);

  const unlockedExercises = userProgress.categoryProgress[category].unlockedExercises.length;

  const achievements = getCategoryAchievements(category, userProgress);
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;
  const totalAchievements = achievements.length;

  return {
    category,
    metadata: CATEGORY_METADATA[category],
    xp: categoryXp,
    level: categoryLevel,
    percentOfTotal,
    rank: rank.rank,
    icon: rank.icon,
    nextRank: rank.nextRank,
    progressToNextRank: rank.progressPercent,
    xpToNextRank: rank.xpToNextRank,
    recentActivity,
    unlockedExercises,
    achievements: {
      unlocked: unlockedAchievements,
      total: totalAchievements,
      list: achievements,
    },
  };
}

/**
 * Get recent activity in a specific category
 * @param category The category to get activity for
 * @param xpHistory XP transaction history
 * @param limit Maximum number of entries to return
 * @returns Recent activity in the specified category
 */
export function getRecentCategoryActivity(category: ProgressCategory, xpHistory: XpTransaction[], limit: number = 5) {
  if (!xpHistory || xpHistory.length === 0) {
    return [];
  }

  const categoryTransactions = xpHistory
    .filter((tx) => tx.category === category)
    .sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return categoryTransactions.slice(0, limit).map((tx) => ({
    date: tx.date,
    amount: tx.amount,
    source: tx.source,
    description: tx.description || tx.source,
  }));
}

/**
 * Get comparative stats across all categories
 * @param userProgress User's progress document
 * @returns Comparative statistics for categories
 */
export function getCategoriesComparison(userProgress: HydratedDocument<IUserProgress>) {
  const categoryData = VALID_CATEGORIES.map((category) => {
    const xp = userProgress.categoryXp[category];
    const level = userProgress.categoryProgress[category].level;
    const rank = getCategoryRank(xp);

    return {
      category,
      name: CATEGORY_METADATA[category].name,
      icon: CATEGORY_METADATA[category].icon,
      color: CATEGORY_METADATA[category].color,
      xp,
      level,
      rank: rank.rank,
      percentOfTotal: userProgress.totalXp > 0
        ? Math.round((xp / userProgress.totalXp) * 100)
        : 0,
    };
  });

  const sortedByXp = [...categoryData].sort((a, b) => b.xp - a.xp);

  const strongest = sortedByXp[0];
  const weakest = sortedByXp[sortedByXp.length - 1];

  let balanceScore = 0;
  if (userProgress.totalXp > 0) {
    const idealPercent = 25;
    const deviations = categoryData.map((cat) =>
      Math.abs(cat.percentOfTotal - idealPercent)
    );
    const averageDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;

    balanceScore = Math.max(0, Math.min(100, 100 - averageDeviation * 4));
  }

  return {
    categories: categoryData,
    strongest,
    weakest,
    balanceScore,
    balanceMessage: getBalanceMessage(balanceScore),
  };
}

/**
 * Get a message describing the user's category balance
 * @param balanceScore Score from 0-100 representing category balance
 * @returns A message describing the balance
 */
function getBalanceMessage(balanceScore: number): string {
  if (balanceScore >= 90) {
    return 'Excellent balance across all fitness categories!';
  } else if (balanceScore >= 70) {
    return 'Good overall balance. Keep it up!';
  } else if (balanceScore >= 50) {
    return 'Decent balance, but some categories need attention.';
  } else if (balanceScore >= 30) {
    return 'Significant imbalance detected. Try to focus on weaker categories.';
  } else {
    return 'Major imbalance across categories. Consider a more balanced approach.';
  }
}

/**
 * Check for category-specific milestones
 * @param category The category to check
 * @param previousXp Previous XP value
 * @param newXp New XP value
 * @returns Milestone information if a milestone was reached, null otherwise
 */
export function checkCategoryMilestone(category: ProgressCategory, previousXp: number, newXp: number) {
  for (const [name, threshold] of Object.entries(CATEGORY_MILESTONES)) {
    if (previousXp < threshold && newXp >= threshold) {
      return {
        category,
        milestone: name,
        threshold,
        newXp,
        message: `Reached ${name} milestone in ${CATEGORY_METADATA[category].name} category!`,
      };
    }
  }

  return null;
}