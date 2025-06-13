import { XpTransaction } from '@/models/UserProgress';
import { IUserProgress } from '@/types/models/progress';

/**
 * Pure category progress calculations and metadata
 * NO XP COORDINATION - just calculations and data structures
 * Used by Progress system for category level calculations
 */

// Category definitions
export enum ProgressCategoryEnum {
  core = 'core',
  push = 'push', 
  pull = 'pull',
  legs = 'legs',
}

export type ProgressCategory = keyof typeof ProgressCategoryEnum;

export const VALID_CATEGORIES = Object.values(ProgressCategoryEnum) as ProgressCategory[];

/**
 * Type guard for category validation
 */
export function isValidCategory(category: string): category is ProgressCategory {
  return VALID_CATEGORIES.includes(category as ProgressCategory);
}

/**
 * Category metadata for UI and calculations
 */
export const CATEGORY_METADATA: Record<ProgressCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
  primaryMuscles: string[];
  xpScaling: number; // Difficulty scaling for XP calculations
}> = {
  [ProgressCategoryEnum.core]: {
    name: 'Core',
    description: 'Core stability and abdominal strength',
    icon: 'disc',
    color: 'bg-blue-500',
    primaryMuscles: ['Rectus Abdominis', 'Obliques', 'Transverse Abdominis', 'Erector Spinae'],
    xpScaling: 1.0,
  },
  [ProgressCategoryEnum.push]: {
    name: 'Push',
    description: 'Pushing movements - chest, shoulders, triceps',
    icon: 'arrow-up',
    color: 'bg-red-500',
    primaryMuscles: ['Pectoralis', 'Deltoids', 'Triceps'],
    xpScaling: 1.0,
  },
  [ProgressCategoryEnum.pull]: {
    name: 'Pull', 
    description: 'Pulling movements - back and biceps',
    icon: 'arrow-down',
    color: 'bg-green-500',
    primaryMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Trapezius', 'Biceps'],
    xpScaling: 1.0,
  },
  [ProgressCategoryEnum.legs]: {
    name: 'Legs',
    description: 'Lower body strength and mobility',
    icon: 'activity', 
    color: 'bg-purple-500',
    primaryMuscles: ['Quadriceps', 'Hamstrings', 'Gluteus', 'Calves'],
    xpScaling: 1.1, // Slightly higher scaling for legs
  },
};

/**
 * XP thresholds for category milestones
 */
export const CATEGORY_MILESTONES = {
  BEGINNER: 500,
  INTERMEDIATE: 1500,
  ADVANCED: 3000,
  EXPERT: 6000,
  MASTER: 10000,
  GRANDMASTER: 20000,
} as const;

/**
 * Category ranks based on XP thresholds
 */
export const CATEGORY_RANKS = [
  { name: 'Novice', threshold: 0, icon: 'user' },
  { name: 'Beginner', threshold: CATEGORY_MILESTONES.BEGINNER, icon: 'award' },
  { name: 'Intermediate', threshold: CATEGORY_MILESTONES.INTERMEDIATE, icon: 'shield' },
  { name: 'Advanced', threshold: CATEGORY_MILESTONES.ADVANCED, icon: 'star' },
  { name: 'Expert', threshold: CATEGORY_MILESTONES.EXPERT, icon: 'crown' },
  { name: 'Master', threshold: CATEGORY_MILESTONES.MASTER, icon: 'gem' },
  { name: 'Grandmaster', threshold: CATEGORY_MILESTONES.GRANDMASTER, icon: 'trophy' },
] as const;

/**
 * Calculate category rank from XP amount
 * Pure calculation - no side effects
 */
export function getCategoryRank(xp: number) {
  // Find the highest rank the user qualifies for
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
        nextRank: nextRank?.name || null,
        progressPercent,
        xpToNextRank,
        currentThreshold: currentRank.threshold,
        nextThreshold: nextRank?.threshold || null,
      };
    }
  }

  // Fallback to first rank
  return {
    rank: CATEGORY_RANKS[0].name,
    icon: CATEGORY_RANKS[0].icon,
    nextRank: CATEGORY_RANKS[1].name,
    progressPercent: 0,
    xpToNextRank: CATEGORY_RANKS[1].threshold,
    currentThreshold: CATEGORY_RANKS[0].threshold,
    nextThreshold: CATEGORY_RANKS[1].threshold,
  };
}

/**
 * Check if XP amount crosses a category milestone
 * Pure calculation - returns milestone info if crossed
 */
export function checkCategoryMilestone(
  category: ProgressCategory,
  previousXp: number,
  newXp: number
): {
  milestone: string | null;
  threshold: number | null;
  rank: string | null;
} {
  // Check each milestone threshold
  for (const [name, threshold] of Object.entries(CATEGORY_MILESTONES)) {
    if (previousXp < threshold && newXp >= threshold) {
      const rank = getCategoryRank(newXp);
      
      return {
        milestone: `${category}_${name.toLowerCase()}`,
        threshold,
        rank: rank.rank,
      };
    }
  }

  return { milestone: null, threshold: null, rank: null };
}

/**
 * Calculate category statistics for display
 * Pure calculation from user progress data
 */
export function getCategoryStatistics(category: ProgressCategory, userProgress: IUserProgress) {
  const categoryXp = userProgress.categoryXp[category] || 0;
  const categoryLevel = userProgress.categoryProgress[category]?.level || 1;
  const rank = getCategoryRank(categoryXp);
  const metadata = CATEGORY_METADATA[category];

  // Calculate percentage of total XP
  const percentOfTotal = userProgress.totalXp > 0
    ? Math.round((categoryXp / userProgress.totalXp) * 100)
    : 0;

  // Get recent activity in this category
  const recentActivity = getRecentCategoryActivity(category, userProgress.xpHistory, 5);

  // Count unlocked exercises (if available)
  const unlockedExercises = userProgress.categoryProgress[category]?.unlockedExercises?.length || 0;

  return {
    category,
    metadata,
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
  };
}

/**
 * Get recent XP activity for a category
 * Pure data extraction - no side effects
 */
export function getRecentCategoryActivity(
  category: ProgressCategory,
  xpHistory: XpTransaction[],
  limit: number = 5
): Array<{ date: string; amount: number; source: string; description?: string }> {
  if (!xpHistory?.length) return [];

  return xpHistory
    .filter(tx => tx.category === category)
    .sort((a, b) => {
      // Sort by timestamp if available, otherwise by date
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })
    .slice(0, limit)
    .map(tx => ({
      date: tx.date.toISOString(),
      amount: tx.amount,
      source: tx.source,
      description: tx.description,
    }));
}

/**
 * Compare categories and find balance
 * Useful for dashboard insights
 */
export function getCategoriesComparison(userProgress: IUserProgress) {
  const categoryData = VALID_CATEGORIES.map(category => {
    const xp = userProgress.categoryXp[category] || 0;
    const level = userProgress.categoryProgress[category]?.level || 1;
    const rank = getCategoryRank(xp);
    const metadata = CATEGORY_METADATA[category];

    return {
      category,
      name: metadata.name,
      icon: metadata.icon,
      color: metadata.color,
      xp,
      level,
      rank: rank.rank,
      percentOfTotal: userProgress.totalXp > 0
        ? Math.round((xp / userProgress.totalXp) * 100)
        : 0,
    };
  });

  // Sort by XP for strongest/weakest
  const sortedByXp = [...categoryData].sort((a, b) => b.xp - a.xp);
  const strongest = sortedByXp[0];
  const weakest = sortedByXp[sortedByXp.length - 1];

  // Calculate balance score (0-100)
  let balanceScore = 0;
  if (userProgress.totalXp > 0) {
    const idealPercent = 25; // 25% per category for perfect balance
    const deviations = categoryData.map(cat => 
      Math.abs(cat.percentOfTotal - idealPercent)
    );
    const averageDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    
    // Convert to 0-100 score (lower deviation = higher score)
    balanceScore = Math.max(0, Math.min(100, 100 - (averageDeviation * 4)));
  }

  return {
    categories: categoryData,
    strongest,
    weakest,
    balanceScore: Math.round(balanceScore),
    balanceMessage: getBalanceMessage(balanceScore),
    averageLevel: categoryData.reduce((sum, cat) => sum + cat.level, 0) / categoryData.length,
  };
}

/**
 * Get balance assessment message
 */
function getBalanceMessage(balanceScore: number): string {
  if (balanceScore >= 90) {
    return 'Excellent balance across all movement patterns!';
  } else if (balanceScore >= 70) {
    return 'Good overall balance with room for minor improvements.';
  } else if (balanceScore >= 50) {
    return 'Decent balance, but some categories need attention.';
  } else if (balanceScore >= 30) {
    return 'Significant imbalance detected. Focus on weaker areas.';
  } else {
    return 'Major imbalance. Consider a more balanced training approach.';
  }
}

/**
 * Calculate category level from XP
 * Uses same formula as UserProgress model
 */
export function calculateCategoryLevel(xp: number): number {
  return Math.floor(1 + Math.pow(xp / 100, 0.8));
}

/**
 * Calculate XP needed for next category level
 */
export function getCategoryXpToNextLevel(currentXp: number): number {
  const currentLevel = calculateCategoryLevel(currentXp);
  const nextLevelXp = Math.ceil(Math.pow(currentLevel + 1, 1.25) * 100);
  return Math.max(0, nextLevelXp - currentXp);
}

/**
 * Get category progress summary for dashboard
 * Clean data structure for UI consumption
 */
export function getCategoryProgressSummary(userProgress: IUserProgress) {
  return VALID_CATEGORIES.map(category => {
    const xp = userProgress.categoryXp[category] || 0;
    const level = userProgress.categoryProgress[category]?.level || 1;
    const rank = getCategoryRank(xp);
    const metadata = CATEGORY_METADATA[category];

    return {
      category,
      name: metadata.name,
      icon: metadata.icon,
      color: metadata.color,
      level,
      xp,
      rank: rank.rank,
      progressPercent: rank.progressPercent,
      xpToNext: rank.xpToNextRank,
    };
  });
}