import { ProgressCategory } from '@/lib/category-progress';

/**
 * Cross-domain unlock logic
 * For determining when achievements or exercises should be unlocked
 * based on progress across multiple domains
 */

/**
 * Cross-domain unlock thresholds
 * These represent requirements that span multiple domains
 */
export const CROSS_DOMAIN_UNLOCKS = {
  // Example: Advanced exercises requiring multiple categories
  MUSCLE_UP: {
    requiredCategories: ['pull', 'core', 'push'] as ProgressCategory[],
    minLevels: { pull: 5, core: 3, push: 3, legs: 0 },
    description: 'Requires pull dominance with core and push support',
  },
  
  // Example: Holistic achievements
  BALANCED_WARRIOR: {
    requiredCategories: ['core', 'push', 'pull', 'legs'] as ProgressCategory[],
    minLevels: { core: 3, push: 3, pull: 3, legs: 3 },
    description: 'Balanced development across all movement patterns',
  },
  
  // Example: Discipline + Performance combo
  CONSISTENCY_MASTER: {
    requirements: {
      totalXp: 5000,
      streakDays: 30,
      categoriesAboveLevel: { level: 5, count: 2 },
    },
    description: 'High performance with unwavering consistency',
  },
} as const;

/**
 * Check if user meets cross-domain unlock requirements
 * This will be called by the achievement system
 */
export function checkCrossDomainUnlocks(
  categoryLevels: Record<ProgressCategory, number>,
  totalXp: number,
  longestStreak: number
): string[] {
  const unlockedAchievements: string[] = [];
  
  // Check BALANCED_WARRIOR
  const balancedWarrior = CROSS_DOMAIN_UNLOCKS.BALANCED_WARRIOR;
  const meetsBalanced = balancedWarrior.requiredCategories.every(
    category => categoryLevels[category] >= balancedWarrior.minLevels[category]
  );
  
  if (meetsBalanced) {
    unlockedAchievements.push('balanced_warrior');
  }
  
  // Check CONSISTENCY_MASTER
  const consistencyMaster = CROSS_DOMAIN_UNLOCKS.CONSISTENCY_MASTER;
  const categoriesAboveLevel5 = Object.values(categoryLevels).filter(level => level >= 5).length;
  
  if (
    totalXp >= consistencyMaster.requirements.totalXp &&
    longestStreak >= consistencyMaster.requirements.streakDays &&
    categoriesAboveLevel5 >= consistencyMaster.requirements.categoriesAboveLevel.count
  ) {
    unlockedAchievements.push('consistency_master');
  }
  
  return unlockedAchievements;
}

/**
 * Check if user can unlock advanced exercises
 * This would be called by the Soma domain
 */
export function checkExerciseUnlocks(
  categoryLevels: Record<ProgressCategory, number>
): string[] {
  const unlockedExercises: string[] = [];
  
  // Check MUSCLE_UP requirements
  const muscleUp = CROSS_DOMAIN_UNLOCKS.MUSCLE_UP;
  const meetsMuscleUp = muscleUp.requiredCategories.every(
    category => categoryLevels[category] >= muscleUp.minLevels[category]
  );
  
  if (meetsMuscleUp) {
    unlockedExercises.push('muscle_up');
  }
  
  return unlockedExercises;
}

/**
 * Get unlock progress for a specific cross-domain requirement
 * Useful for showing users how close they are to unlocking something
 */
export function getUnlockProgress(
  unlockKey: keyof typeof CROSS_DOMAIN_UNLOCKS,
  categoryLevels: Record<ProgressCategory, number>,
  totalXp?: number,
  longestStreak?: number
): { progress: number; missing: string[] } {
  const unlock = CROSS_DOMAIN_UNLOCKS[unlockKey];
  const missing: string[] = [];
  let totalRequirements = 0;
  let metRequirements = 0;
  
  if ('minLevels' in unlock) {
    // Category-based requirements
    for (const category of unlock.requiredCategories) {
      totalRequirements++;
      const required = unlock.minLevels[category];
      const current = categoryLevels[category] || 1;
      
      if (current >= required) {
        metRequirements++;
      } else {
        missing.push(`${category}: level ${current}/${required}`);
      }
    }
  }
  
  if ('requirements' in unlock) {
    // Complex requirements
    const reqs = unlock.requirements;
    
    if ('totalXp' in reqs) {
      totalRequirements++;
      if ((totalXp || 0) >= reqs.totalXp) {
        metRequirements++;
      } else {
        missing.push(`XP: ${totalXp || 0}/${reqs.totalXp}`);
      }
    }
    
    if ('streakDays' in reqs) {
      totalRequirements++;
      if ((longestStreak || 0) >= reqs.streakDays) {
        metRequirements++;
      } else {
        missing.push(`Streak: ${longestStreak || 0}/${reqs.streakDays} days`);
      }
    }
  }
  
  const progress = totalRequirements > 0 ? Math.floor((metRequirements / totalRequirements) * 100) : 0;
  
  return { progress, missing };
}