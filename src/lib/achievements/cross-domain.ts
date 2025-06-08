import { AchievementDefinition } from './index';

/**
 * Cross-domain achievements - global milestones spanning multiple domains
 */
export const CROSS_DOMAIN_ACHIEVEMENTS: AchievementDefinition[] = [
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
  }
];