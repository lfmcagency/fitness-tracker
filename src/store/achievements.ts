// src/store/achievements.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AchievementData } from '@/types/api/achievementResponses';

export interface AchievementWithStatus extends AchievementData {
  status: 'pending' | 'claimed' | 'locked';
  canClaim: boolean;
}

interface AchievementState {
  // Core data
  achievements: AchievementWithStatus[];
  isLoading: boolean;
  error: string | null;
  
  // Stats for quick access
  stats: {
    total: number;
    claimed: number;
    pending: number;
    locked: number;
    claimableXp: number; // Total XP from pending achievements
  };
  
  // Filters
  statusFilter: 'all' | 'pending' | 'claimed' | 'locked';
  typeFilter: string; // 'all' | 'strength' | 'consistency' | etc.
  
  // Actions
  fetchAchievements: () => Promise<void>;
  claimAchievement: (achievementId: string) => Promise<boolean>;
  setStatusFilter: (filter: 'all' | 'pending' | 'claimed' | 'locked') => void;
  setTypeFilter: (filter: string) => void;
  clearError: () => void;
  
  // Getters
  getPendingAchievements: () => AchievementWithStatus[];
  getClaimedAchievements: () => AchievementWithStatus[];
  getFilteredAchievements: () => AchievementWithStatus[];
}

export const useAchievementStore = create<AchievementState>()(
  devtools(
    (set, get) => ({
      // Initial state
      achievements: [],
      isLoading: false,
      error: null,
      stats: {
        total: 0,
        claimed: 0,
        pending: 0,
        locked: 0,
        claimableXp: 0,
      },
      statusFilter: 'all',
      typeFilter: 'all',

      /**
       * Fetch all achievements with their status (pending/claimed/locked)
       */
      fetchAchievements: async () => {
        console.log('🏆 [STORE] Fetching achievements...');
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/achievements');
          
          if (!response.ok) {
            throw new Error(`Failed to fetch achievements: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error?.message || 'Failed to fetch achievements');
          }
          
          // Transform API data to include status and canClaim
          const achievementsWithStatus: AchievementWithStatus[] = (data.data?.list || []).map((achievement: AchievementData) => {
  return {
    ...achievement,
    status: achievement.status || 'locked', // Use API status directly
    canClaim: achievement.status === 'pending',
  };
});
          
          // Calculate stats
          const stats = {
  total: data.data?.totalCount || 0,
  claimed: data.data?.claimedCount || 0,
  pending: data.data?.pendingCount || 0,
  locked: data.data?.lockedCount || 0,
  claimableXp: achievementsWithStatus
    .filter(a => a.status === 'pending')
    .reduce((total, a) => total + a.xpReward, 0),
};
          
          console.log(`✅ [STORE] Loaded ${achievementsWithStatus.length} achievements`, stats);
          
          set({
            achievements: achievementsWithStatus,
            stats,
            isLoading: false,
          });
        } catch (error) {
          console.error('💥 [STORE] Error fetching achievements:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch achievements',
            isLoading: false,
          });
        }
      },

      /**
       * Claim a pending achievement (moves to claimed + awards XP)
       */
      claimAchievement: async (achievementId: string) => {
        console.log(`🎯 [STORE] Claiming achievement: ${achievementId}`);
        
        const { achievements } = get();
        const achievement = achievements.find(a => a.id === achievementId);
        
        if (!achievement) {
          console.error(`❌ [STORE] Achievement not found: ${achievementId}`);
          return false;
        }
        
        if (achievement.status !== 'pending') {
          console.error(`❌ [STORE] Achievement not claimable: ${achievementId} (status: ${achievement.status})`);
          return false;
        }
        
        try {
          const response = await fetch(`/api/achievements/${achievementId}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to claim achievement: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error?.message || 'Failed to claim achievement');
          }
          
          console.log(`🎉 [STORE] Achievement claimed! XP awarded: ${data.data?.xpAwarded || 0}`);
          
          // Update local state - move from pending to claimed
          set((state) => {
            const updatedAchievements = state.achievements.map(a =>
              a.id === achievementId
                ? { ...a, status: 'claimed' as const, canClaim: false }
                : a
            );
            
            // Recalculate stats
            const newStats = {
              total: updatedAchievements.length,
              claimed: updatedAchievements.filter(a => a.status === 'claimed').length,
              pending: updatedAchievements.filter(a => a.status === 'pending').length,
              locked: updatedAchievements.filter(a => a.status === 'locked').length,
              claimableXp: updatedAchievements
                .filter(a => a.status === 'pending')
                .reduce((total, a) => total + a.xpReward, 0),
            };
            
            return {
              achievements: updatedAchievements,
              stats: newStats,
            };
          });
          
          return true;
        } catch (error) {
          console.error('💥 [STORE] Error claiming achievement:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to claim achievement',
          });
          return false;
        }
      },

      /**
       * Set status filter for UI
       */
      setStatusFilter: (filter) => {
        set({ statusFilter: filter });
      },

      /**
       * Set type filter for UI
       */
      setTypeFilter: (filter) => {
        set({ typeFilter: filter });
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Get pending achievements (glowing trophies)
       */
      getPendingAchievements: () => {
        const { achievements } = get();
        return achievements.filter(a => a.status === 'pending');
      },

      /**
       * Get claimed achievements
       */
      getClaimedAchievements: () => {
        const { achievements } = get();
        return achievements.filter(a => a.status === 'claimed');
      },

      /**
       * Get filtered achievements based on current filters
       */
      getFilteredAchievements: () => {
        const { achievements, statusFilter, typeFilter } = get();
        
        return achievements.filter(achievement => {
          // Status filter
          const statusMatch = statusFilter === 'all' || achievement.status === statusFilter;
          
          // Type filter
          const typeMatch = typeFilter === 'all' || achievement.type === typeFilter;
          
          return statusMatch && typeMatch;
        });
      },
    }),
    {
      name: 'achievement-store',
      partialize: (state: { statusFilter: any; typeFilter: any; }) => ({
        // Don't persist loading/error states
        statusFilter: state.statusFilter,
        typeFilter: state.typeFilter,
      }),
    }
  )
);