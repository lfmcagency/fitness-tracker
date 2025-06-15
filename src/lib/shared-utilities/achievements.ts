// Achievement extraction and notification handling (eliminates 3x duplication)

/**
 * Standard achievement notification interface
 * Used across all domains for consistency
 */
export interface AchievementNotification {
  unlockedCount: number;
  achievements: string[];
  message?: string;
  xpAwarded?: number;
  totalXp?: number;
}

/**
 * Individual achievement data structure
 */
export interface AchievementData {
  id: string;
  title: string;
  description: string;
  type: string;
  xpReward: number;
  status: 'pending' | 'claimed' | 'locked';
  unlockedAt?: string;
  claimedAt?: string;
}

/**
 * Extract achievement notifications from API response data
 * Used by all stores when processing API responses that might include achievements
 */
export function extractAchievements(responseData: any): AchievementNotification | null {
  // Handle different response formats from coordinator
  const achievementData = responseData?.achievements || responseData?.result?.achievements;
  
  if (!achievementData) {
    return null;
  }

  // Check for unlock count
  const unlockedCount = achievementData.unlockedCount || achievementData.unlocked?.length || 0;
  
  if (unlockedCount === 0) {
    return null;
  }

  // Extract achievement list
  const achievements = achievementData.achievements || 
                      achievementData.unlocked || 
                      achievementData.list || 
                      [];

  // Calculate total XP from achievements
  const xpAwarded = achievementData.xpAwarded || 
                   achievements.reduce((total: number, achievement: any) => {
                     return total + (achievement.xpReward || achievement.xp || 0);
                   }, 0);

  return {
    unlockedCount,
    achievements: Array.isArray(achievements) ? achievements : [],
    message: `🎉 ${unlockedCount} achievement${unlockedCount > 1 ? 's' : ''} unlocked!`,
    xpAwarded,
    totalXp: responseData?.totalXp || responseData?.result?.totalXp
  };
}

/**
 * Extract achievement notifications specifically from coordinator event results
 * Used when processing responses from progress event firing
 */
export function extractCoordinatorAchievements(coordinatorResult: any): AchievementNotification | null {
  if (!coordinatorResult?.achievementsNotified) {
    return null;
  }

  const notified = coordinatorResult.achievementsNotified;
  
  if (!Array.isArray(notified) || notified.length === 0) {
    return null;
  }

  return {
    unlockedCount: notified.length,
    achievements: notified.map((achievement: any) => achievement.title || achievement.id || achievement),
    message: `🏆 ${notified.length} achievement${notified.length > 1 ? 's' : ''} earned!`,
    xpAwarded: notified.reduce((total: number, achievement: any) => 
      total + (achievement.xpReward || achievement.xp || 0), 0
    )
  };
}

/**
 * Merge multiple achievement notifications
 * Useful when multiple operations might unlock achievements
 */
export function mergeAchievementNotifications(...notifications: (AchievementNotification | null)[]): AchievementNotification | null {
  const valid = notifications.filter(n => n !== null) as AchievementNotification[];
  
  if (valid.length === 0) {
    return null;
  }

  if (valid.length === 1) {
    return valid[0];
  }

  const merged = valid.reduce((acc, notification) => ({
    unlockedCount: acc.unlockedCount + notification.unlockedCount,
    achievements: [...acc.achievements, ...notification.achievements],
    xpAwarded: (acc.xpAwarded || 0) + (notification.xpAwarded || 0)
  }), {
    unlockedCount: 0,
    achievements: [] as string[],
    xpAwarded: 0
  });

  return {
    ...merged,
    message: `🎉 ${merged.unlockedCount} achievement${merged.unlockedCount > 1 ? 's' : ''} unlocked!`
  };
}

/**
 * Filter achievements by status for UI display
 */
export function filterAchievementsByStatus(
  achievements: AchievementData[],
  status: 'all' | 'pending' | 'claimed' | 'locked'
): AchievementData[] {
  if (status === 'all') {
    return achievements;
  }
  
  return achievements.filter(achievement => achievement.status === status);
}

/**
 * Filter achievements by type for UI display
 */
export function filterAchievementsByType(
  achievements: AchievementData[],
  type: string
): AchievementData[] {
  if (type === 'all') {
    return achievements;
  }
  
  return achievements.filter(achievement => achievement.type === type);
}

/**
 * Sort achievements for display (pending first, then by unlock date)
 */
export function sortAchievementsForDisplay(achievements: AchievementData[]): AchievementData[] {
  return [...achievements].sort((a, b) => {
    // Pending achievements first (can be claimed)
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    
    // Then by unlock date (most recent first)
    if (a.unlockedAt && b.unlockedAt) {
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    }
    
    // Finally by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Calculate achievement statistics for dashboard display
 */
export interface AchievementStats {
  total: number;
  claimed: number;
  pending: number;
  locked: number;
  claimableXp: number;
  claimedXp: number;
  completionRate: number;
}

export function calculateAchievementStats(achievements: AchievementData[]): AchievementStats {
  const stats = achievements.reduce((acc, achievement) => {
    acc.total++;
    
    switch (achievement.status) {
      case 'claimed':
        acc.claimed++;
        acc.claimedXp += achievement.xpReward;
        break;
      case 'pending':
        acc.pending++;
        acc.claimableXp += achievement.xpReward;
        break;
      case 'locked':
        acc.locked++;
        break;
    }
    
    return acc;
  }, {
    total: 0,
    claimed: 0,
    pending: 0,
    locked: 0,
    claimableXp: 0,
    claimedXp: 0
  });

  return {
    ...stats,
    completionRate: stats.total > 0 ? Math.round((stats.claimed / stats.total) * 100) : 0
  };
}

/**
 * Get unique achievement types for filtering
 */
export function getAchievementTypes(achievements: AchievementData[]): string[] {
  const types = new Set(achievements.map(a => a.type));
  return Array.from(types).sort();
}

/**
 * Check if user has any claimable achievements
 */
export function hasClaimableAchievements(achievements: AchievementData[]): boolean {
  return achievements.some(achievement => achievement.status === 'pending');
}

/**
 * Get achievements that can be claimed (pending status)
 */
export function getClaimableAchievements(achievements: AchievementData[]): AchievementData[] {
  return achievements.filter(achievement => achievement.status === 'pending');
}

/**
 * Achievement notification display utilities
 */
export interface NotificationDisplayOptions {
  duration?: number;
  showXp?: boolean;
  autoHide?: boolean;
  sound?: boolean;
}

export function formatAchievementMessage(
  notification: AchievementNotification,
  options: NotificationDisplayOptions = {}
): string {
  const { showXp = true } = options;
  
  let message = notification.message || `🎉 ${notification.unlockedCount} achievement unlocked!`;
  
  if (showXp && notification.xpAwarded && notification.xpAwarded > 0) {
    message += ` (+${notification.xpAwarded} XP)`;
  }
  
  return message;
}

/**
 * Convert achievement notification to display format for UI components
 */
export interface AchievementToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info';
  duration: number;
  data: AchievementNotification;
}

export function createAchievementToast(
  notification: AchievementNotification,
  options: NotificationDisplayOptions = {}
): AchievementToastData {
  return {
    id: `achievement-${Date.now()}`,
    title: 'Achievement Unlocked!',
    message: formatAchievementMessage(notification, options),
    type: 'success',
    duration: options.duration || 5000,
    data: notification
  };
}