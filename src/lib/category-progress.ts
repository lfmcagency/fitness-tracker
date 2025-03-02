import { IUserProgress, XpTransaction } from '@/models/UserProgress';
import { AchievementDefinition, ACHIEVEMENTS } from './achievements';

export type ProgressCategory = 'core' | 'push' | 'pull' | 'legs';
export const VALID_CATEGORIES: ProgressCategory[] = ['core', 'push', 'pull', 'legs'];

// Category metadata for UI display and business logic
export const CATEGORY_METADATA = {
  core: {
    name: 'Core',
    description: 'Abdominal and lower back exercises',
    icon: 'disc',
    color: 'bg-blue-500',
    primaryMuscles: ['Rectus Abdominis', 'Obliques', 'Transverse Abdominis', 'Erector Spinae'],
    scaling: 1.0 // Baseline scaling factor for level calculation
  },
  push: {
    name: 'Push',
    description: 'Pushing movements involving chest, shoulders, and triceps',
    icon: 'arrow-up',
    color: 'bg-red-500',
    primaryMuscles: ['Pectoralis', 'Deltoids', 'Triceps'],
    scaling: 1.0
  },
  pull: {
    name: 'Pull',
    description: 'Pulling movements involving back and biceps',
    icon: 'arrow-down',
    color: 'bg-green-500',
    primaryMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Trapezius', 'Biceps'],
    scaling: 1.0
  },
  legs: {
    name: 'Legs',
    description: 'Lower body exercises involving quadriceps, hamstrings, and calves',
    icon: 'activity',
    color: 'bg-purple-500',
    primaryMuscles: ['Quadriceps', 'Hamstrings', 'Gluteus', 'Calves'],
    scaling: 1.1 // Slightly higher scaling to encourage leg training
  }
};

// Milestone XP thresholds for categories
export const CATEGORY_MILESTONES = {
  BEGINNER: 500,
  INTERMEDIATE: 1500,
  ADVANCED: 3000,
  EXPERT: 6000,
  MASTER: 10000
};

// Category ranks based on XP thresholds
export const CATEGORY_RANKS = [
  { name: 'Novice', threshold: 0, icon: 'user' },
  { name: 'Beginner', threshold: CATEGORY_MILESTONES.BEGINNER, icon: 'award' },
  { name: 'Intermediate', threshold: CATEGORY_MILESTONES.INTERMEDIATE, icon: 'shield' },
  { name: 'Advanced', threshold: CATEGORY_MILESTONES.ADVANCED, icon: 'star' },
  { name: 'Expert', threshold: CATEGORY_MILESTONES.EXPERT, icon: 'crown' },
  { name: 'Master', threshold: CATEGORY_MILESTONES.MASTER, icon: 'award-filled' }
];

/**
 * Get the current rank for a specific amount of category XP
 * @param xp The XP amount to calculate rank for
 * @returns The user's rank information
 */
export function getCategoryRank(xp: number) {
  // Start from the highest rank and work backwards
  for (let i = CATEGORY_RANKS.length - 1; i >= 0; i--) {
    if (xp >= CATEGORY_RANKS[i].threshold) {
      const currentRank = CATEGORY_RANKS[i];
      const nextRank = i < CATEGORY_RANKS.length - 1 ? CATEGORY_RANKS[i + 1] : null;
      
      // Calculate progress to next rank
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
        xpToNextRank
      };
    }
  }
  
  // Fallback (should never happen as first rank has 0 threshold)
  return {
    rank: CATEGORY_RANKS[0].name,
    icon: CATEGORY_RANKS[0].icon,
    nextRank: CATEGORY_RANKS[1].name,
    progressPercent: 0,
    xpToNextRank: CATEGORY_RANKS[1].threshold
  };
}

/**
 * Get achievements specific to a category
 * @param category The category to get achievements for
 * @param userProgress The user's progress document
 * @returns Array of category achievements with unlock status
 */
export function getCategoryAchievements(
  category: ProgressCategory,
  userProgress: IUserProgress | null
) {
  // Filter achievements specific to this category
  const categoryAchievements = ACHIEVEMENTS.filter(achievement => {
    // Check if this achievement is specific to the requested category
    if (achievement.requirements.categoryLevel) {
      return achievement.requirements.categoryLevel.category === category;
    }
    return false;
  });
  
  // If we don't have user progress, just return the achievements
  if (!userProgress) {
    return categoryAchievements.map(achievement => ({
      ...achievement,
      unlocked: false,
      progress: 0
    }));
  }
  
  // Get user's achievement IDs
  const userAchievementIds = userProgress.achievements.map(id => id.toString());
  
  // Annotate achievements with unlock status and progress
  return categoryAchievements.map(achievement => {
    // Check if unlocked
    const unlocked = userAchievementIds.includes(achievement.id);
    
    // Calculate progress
    let progress = 0;
    if (achievement.requirements.categoryLevel) {
      const { category, level } = achievement.requirements.categoryLevel;
      const userCategoryLevel = userProgress.categoryProgress[category].level;
      progress = Math.min(100, Math.floor((userCategoryLevel / level) * 100));
    }
    
    return {
      ...achievement,
      unlocked,
      progress
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
  // Get basic category data
  const categoryXp = userProgress.categoryXp[category];
  const categoryLevel = userProgress.categoryProgress[category].level;
  const rank = getCategoryRank(categoryXp);
  
  // Calculate percentage of total XP
  const percentOfTotal = userProgress.totalXp > 0 
    ? Math.round((categoryXp / userProgress.totalXp) * 100) 
    : 0;
  
  // Calculate recent activity in this category
  const recentActivity = getRecentCategoryActivity(category, userProgress.xpHistory);
  
  // Get number of unlocked exercises
  const unlockedExercises = userProgress.categoryProgress[category].unlockedExercises.length;
  
  // Get category-specific achievements
  const achievements = getCategoryAchievements(category, userProgress);
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
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
      list: achievements
    }
  };
}

/**
 * Get recent activity in a specific category
 * @param category The category to get activity for
 * @param xpHistory XP transaction history
 * @param limit Maximum number of entries to return
 * @returns Recent activity in the specified category
 */
export function getRecentCategoryActivity(
  category: ProgressCategory, 
  xpHistory: XpTransaction[],
  limit: number = 5
) {
  if (!xpHistory || xpHistory.length === 0) {
    return [];
  }
  
  // Filter and sort transactions for this category
  const categoryTransactions = xpHistory
    .filter(tx => tx.category === category)
    .sort((a, b) => {
      // Sort by timestamp if available, otherwise by date
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  
  // Take the most recent entries
  return categoryTransactions.slice(0, limit).map(tx => ({
    date: tx.date,
    amount: tx.amount,
    source: tx.source,
    description: tx.description || tx.source
  }));
}

/**
 * Get comparative stats across all categories
 * @param userProgress User's progress document
 * @returns Comparative statistics for categories
 */
export function getCategoriesComparison(userProgress: IUserProgress) {
  // Prepare category data
  const categoryData = VALID_CATEGORIES.map(category => {
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
        : 0
    };
  });
  
  // Sort by XP (highest to lowest)
  const sortedByXp = [...categoryData].sort((a, b) => b.xp - a.xp);
  
  // Identify strongest and weakest categories
  const strongest = sortedByXp[0];
  const weakest = sortedByXp[sortedByXp.length - 1];
  
  // Calculate balance score (0-100)
  // Higher score means more balanced distribution of XP across categories
  let balanceScore = 0;
  if (userProgress.totalXp > 0) {
    // Ideal distribution would be 25% per category
    const idealPercent = 25;
    const deviations = categoryData.map(cat => 
      Math.abs(cat.percentOfTotal - idealPercent)
    );
    const averageDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
    
    // Convert to a score where 0 deviation = 100 score, and max deviation (25) = 0 score
    balanceScore = Math.max(0, Math.min(100, 100 - (averageDeviation * 4)));
  }
  
  return {
    categories: categoryData,
    strongest,
    weakest,
    balanceScore,
    balanceMessage: getBalanceMessage(balanceScore)
  };
}

/**
 * Get a message describing the user's category balance
 * @param balanceScore Score from 0-100 representing category balance
 * @returns A message describing the balance
 */
function getBalanceMessage(balanceScore: number): string {
  if (balanceScore >= 90) {
    return "Excellent balance across all fitness categories!";
  } else if (balanceScore >= 70) {
    return "Good overall balance. Keep it up!";
  } else if (balanceScore >= 50) {
    return "Decent balance, but some categories need attention.";
  } else if (balanceScore >= 30) {
    return "Significant imbalance detected. Try to focus on weaker categories.";
  } else {
    return "Major imbalance across categories. Consider a more balanced approach.";
  }
}

/**
 * Check for category-specific milestones
 * @param category The category to check
 * @param previousXp Previous XP value
 * @param newXp New XP value
 * @returns Milestone information if a milestone was reached, null otherwise
 */
export function checkCategoryMilestone(
  category: ProgressCategory,
  previousXp: number,
  newXp: number
) {
  // Check against each milestone
  for (const [name, threshold] of Object.entries(CATEGORY_MILESTONES)) {
    // If we crossed a milestone threshold
    if (previousXp < threshold && newXp >= threshold) {
      return {
        category,
        milestone: name,
        threshold,
        newXp,
        message: `Reached ${name} milestone in ${CATEGORY_METADATA[category].name} category!`
      };
    }
  }
  
  // No milestone reached
  return null;
}