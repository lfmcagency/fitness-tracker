// stores/achievements.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AchievementData } from '@/types/api/achievementResponses';

interface AchievementStore {
  // Achievement data
  achievements: AchievementData[];
  unlockedAchievements: string[]; // IDs of unlocked achievements
  recentlyUnlocked: AchievementData[]; // For notifications/celebrations
  isLoading: boolean;
  error: string | null;
  
  // Stats
  stats: {
    total: number;
    unlocked: number;
    percentage: number;
  };
  
  // Actions
  fetchAchievements: () => Promise<void>;
  claimAchievement: (id: string) => Promise<boolean>;
  clearRecentlyUnlocked: () => void;
}

export const useAchievementStore = create<AchievementStore>()(
  devtools(
    (set, get) => ({
      achievements: [],
      unlockedAchievements: [],
      recentlyUnlocked: [],
      isLoading: false,
      error: null,
      stats: {
        total: 0,
        unlocked: 0,
        percentage: 0
      },
      fetchAchievements: async () => {
        set({ isLoading: true });
        try {
          // TODO: Implement API call
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      claimAchievement: async (id: string) => {
        try {
          // TODO: Implement API call
          return true;
        } catch {
          return false;
        }
      },
      clearRecentlyUnlocked: () => set({ recentlyUnlocked: [] })
    })
  )
);