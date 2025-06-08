import { AchievementDefinition } from './index';

/**
 * Soma domain achievements - strength and physical training
 */
export const SOMA_ACHIEVEMENTS: AchievementDefinition[] = [
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
  }
];