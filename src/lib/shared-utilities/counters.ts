// Counter and streak calculation logic for all domains (foundation for soma integration)

/**
 * Basic counter interface - foundation for all domains
 */
export interface Counter {
  current: number;
  total: number;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

/**
 * Streak counter with streak-specific logic
 */
export interface StreakCounter extends Counter {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: Date | null;
  streakStart: Date | null;
}

/**
 * Create a new basic counter
 */
export function createCounter(initial: number = 0): Counter {
  return {
    current: initial,
    total: initial,
    lastUpdated: new Date(),
    metadata: {}
  };
}

/**
 * Create a new streak counter
 */
export function createStreakCounter(): StreakCounter {
  return {
    current: 0,
    total: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastUpdated: new Date(),
    lastActiveDate: null,
    streakStart: null,
    metadata: {}
  };
}

/**
 * Increment a basic counter
 */
export function incrementCounter(counter: Counter, amount: number = 1): Counter {
  return {
    ...counter,
    current: counter.current + amount,
    total: counter.total + amount,
    lastUpdated: new Date()
  };
}

/**
 * Decrement a basic counter (with minimum of 0)
 */
export function decrementCounter(counter: Counter, amount: number = 1): Counter {
  return {
    ...counter,
    current: Math.max(0, counter.current - amount),
    lastUpdated: new Date()
  };
}

/**
 * Reset current value while keeping total
 */
export function resetCounterCurrent(counter: Counter): Counter {
  return {
    ...counter,
    current: 0,
    lastUpdated: new Date()
  };
}

/**
 * Calculate streak for task-like items based on completion history
 * Efficient algorithm with early termination (fixes 365-day loop problem)
 */
export function calculateStreak(
  completionDates: Date[],
  recurrencePattern: 'once' | 'daily' | 'custom',
  customDays?: number[]
): { currentStreak: number; bestStreak: number } {
  
  if (!completionDates || completionDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Sort dates descending (most recent first)
  const sortedDates = [...completionDates]
  .map(date => date instanceof Date ? date : new Date(date))
  .sort((a, b) => b.getTime() - a.getTime());

  // For 'once' pattern, no streak concept
  if (recurrencePattern === 'once') {
    return { currentStreak: completionDates.length > 0 ? 1 : 0, bestStreak: 1 };
  }

  // Calculate current streak
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Helper function to check if task should be done on a specific date
  const shouldTaskBeDone = (date: Date): boolean => {
    if (recurrencePattern === 'daily') {
      return true;
    }
    
    if (recurrencePattern === 'custom' && customDays && customDays.length > 0) {
      return customDays.includes(date.getDay());
    }
    
    return false;
  };

  // Helper function to normalize date for comparison
  const normalizeDate = (date: Date): string => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toDateString();
  };

  // Group completions by date for efficient lookup
  const completionsByDate = new Set(
    sortedDates.map(date => normalizeDate(date))
  );

  // Calculate current streak starting from today
  let checkDate = new Date(today);
  
  // For current streak, check backwards from today
  // Limit to reasonable timeframe (30 days max for current streak)
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const dateStr = normalizeDate(checkDate);
    
    if (shouldTaskBeDone(checkDate)) {
      if (completionsByDate.has(dateStr)) {
        currentStreak++;
      } else {
        // Break on first missing required day
        break;
      }
    }
    
    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate best streak (historical maximum)
  // More efficient approach: scan through sorted completion dates
  tempStreak = 0;
  let lastCompletionDate: Date | null = null;
  
  for (const completionDate of sortedDates.reverse()) { // Reverse to chronological order
    const currentDate = new Date(completionDate);
    currentDate.setHours(0, 0, 0, 0);
    
    if (lastCompletionDate === null) {
      tempStreak = 1;
    } else {
      // Calculate days between completions
      const daysDiff = Math.floor(
        (currentDate.getTime() - lastCompletionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Check if streak continues based on recurrence pattern
      let streakContinues = false;
      
      if (recurrencePattern === 'daily') {
        streakContinues = daysDiff <= 1;
      } else if (recurrencePattern === 'custom' && customDays && customDays.length > 0) {
        // For custom patterns, check if all required days between dates were completed
        // This is a simplified check - in practice, this might need more sophisticated logic
        streakContinues = daysDiff <= 7; // Arbitrary threshold for custom patterns
      }
      
      if (streakContinues) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    lastCompletionDate = currentDate;
  }
  
  bestStreak = Math.max(bestStreak, tempStreak);

  return { 
    currentStreak: Math.max(currentStreak, 0), 
    bestStreak: Math.max(bestStreak, currentStreak) 
  };
}

/**
 * Update streak counter with new completion
 */
export function updateStreakCounter(
  counter: StreakCounter,
  completionDate: Date = new Date()
): StreakCounter {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const completion = new Date(completionDate);
  completion.setHours(0, 0, 0, 0);
  
  const lastActive = counter.lastActiveDate ? new Date(counter.lastActiveDate) : null;
  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
  }
  
  let newCurrentStreak = counter.currentStreak;
  let newStreakStart = counter.streakStart;
  
  // If this is the first completion or first completion in a while
  if (!lastActive) {
    newCurrentStreak = 1;
    newStreakStart = completion;
  } else {
    const daysDiff = Math.floor(
      (completion.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff === 1) {
      // Consecutive day - increment streak
      newCurrentStreak = counter.currentStreak + 1;
    } else if (daysDiff === 0) {
      // Same day - no change to streak
      newCurrentStreak = counter.currentStreak;
    } else {
      // Gap in days - reset streak
      newCurrentStreak = 1;
      newStreakStart = completion;
    }
  }
  
  return {
    ...counter,
    current: counter.current + 1,
    total: counter.total + 1,
    currentStreak: newCurrentStreak,
    bestStreak: Math.max(counter.bestStreak, newCurrentStreak),
    lastUpdated: new Date(),
    lastActiveDate: completion,
    streakStart: newStreakStart
  };
}

/**
 * Break a streak (when task is not completed)
 */
export function breakStreakCounter(counter: StreakCounter): StreakCounter {
  return {
    ...counter,
    currentStreak: 0,
    streakStart: null,
    lastUpdated: new Date()
  };
}

/**
 * Calculate milestone achievements for counters
 * Used by coordinator to determine when to fire achievement events
 */
export interface CounterMilestone {
  type: 'total' | 'streak' | 'streak_best';
  threshold: number;
  achieved: boolean;
  justAchieved: boolean; // True if this is the first time hitting this threshold
}

export function calculateCounterMilestones(
  current: Counter | StreakCounter,
  previous: Counter | StreakCounter | null,
  milestoneThresholds: number[] = [1, 3, 7, 14, 30, 50, 100, 250, 500, 1000]
): CounterMilestone[] {
  const milestones: CounterMilestone[] = [];
  
  // Total count milestones
  for (const threshold of milestoneThresholds) {
    const achieved = current.total >= threshold;
    const justAchieved = achieved && (!previous || previous.total < threshold);
    
    milestones.push({
      type: 'total',
      threshold,
      achieved,
      justAchieved
    });
  }
  
  // Streak milestones (if it's a streak counter)
  if ('currentStreak' in current) {
    const streakCounter = current as StreakCounter;
    const prevStreakCounter = previous as StreakCounter | null;
    
    for (const threshold of milestoneThresholds) {
      const achieved = streakCounter.currentStreak >= threshold;
      const justAchieved = achieved && (!prevStreakCounter || prevStreakCounter.currentStreak < threshold);
      
      milestones.push({
        type: 'streak',
        threshold,
        achieved,
        justAchieved
      });
    }
    
    // Best streak milestones
    for (const threshold of milestoneThresholds) {
      const achieved = streakCounter.bestStreak >= threshold;
      const justAchieved = achieved && (!prevStreakCounter || prevStreakCounter.bestStreak < threshold);
      
      milestones.push({
        type: 'streak_best',
        threshold,
        achieved,
        justAchieved
      });
    }
  }
  
  return milestones.filter(m => m.justAchieved); // Only return newly achieved milestones
}

/**
 * Format counter for display
 */
export function formatCounterDisplay(counter: Counter | StreakCounter): {
  current: string;
  total: string;
  streak?: string;
  bestStreak?: string;
} {
  const result = {
    current: counter.current.toLocaleString(),
    total: counter.total.toLocaleString()
  };
  
  if ('currentStreak' in counter) {
    const streakCounter = counter as StreakCounter;
    return {
      ...result,
      streak: streakCounter.currentStreak.toLocaleString(),
      bestStreak: streakCounter.bestStreak.toLocaleString()
    };
  }
  
  return result;
}

/**
 * Calculate percentage completion towards next milestone
 */
export function calculateMilestoneProgress(
  current: number,
  milestoneThresholds: number[] = [1, 3, 7, 14, 30, 50, 100, 250, 500, 1000]
): { nextMilestone: number | null; progress: number } {
  // Find next milestone
  const nextMilestone = milestoneThresholds.find(threshold => threshold > current);
  
  if (!nextMilestone) {
    return { nextMilestone: null, progress: 100 };
  }
  
  // Find previous milestone
  const prevMilestone = milestoneThresholds
    .filter(threshold => threshold <= current)
    .pop() || 0;
  
  // Calculate progress percentage
  const progress = nextMilestone === prevMilestone 
    ? 0 
    : Math.round(((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100);
  
  return { nextMilestone, progress };
}