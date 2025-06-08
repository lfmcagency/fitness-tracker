import { AchievementDefinition } from './index';

/**
 * Ethos domain achievements - consistency, habits, and discipline
 */
export const ETHOS_ACHIEVEMENTS: AchievementDefinition[] = [
  // Task streak achievements
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
  
  // Workout completion achievements
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