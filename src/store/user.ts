// src/store/user.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UserProfilePayload, IUserProfileData, ApiWeightEntry } from '@/types/api/userResponses';
import { UserSettingsPayload, UpdateUserSettingsRequest } from '@/types/api/settingsResponses';
import { WeightHistoryPayload, AddWeightEntryRequest, AddedWeightEntryPayload } from '@/types/api/weightResponses';
import { IUserSettings, IWeightEntry as DbWeightEntry } from '@/types/models/user';
// --- FIX: Add missing import ---
import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/types/api/common';

interface UserStoreState {
  profile: IUserProfileData | null;
  settings: IUserSettings | null;
  weightHistory: ApiWeightEntry[] | null;
  weightUnit: 'kg' | 'lbs';
  isLoadingProfile: boolean;
  isLoadingSettings: boolean;
  isLoadingWeight: boolean;
  isUpdatingSettings: boolean;
  isAddingWeight: boolean;
  isDeletingWeight: boolean;
  error: string | null;
}

interface UserStoreActions {
  initializeUser: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<IUserSettings>) => Promise<boolean>;
  fetchWeightHistory: (params?: { limit?: number; sort?: 'asc' | 'desc' }) => Promise<void>;
  addWeightEntry: (entryData: AddWeightEntryRequest) => Promise<boolean>;
  deleteWeightEntry: (entryId: string) => Promise<boolean>;
  clearError: () => void;
  clearUserState: () => void;
}

type UserStore = UserStoreState & UserStoreActions;

const initialState: UserStoreState = {
  profile: null,
  settings: null,
  weightHistory: null,
  weightUnit: 'kg',
  isLoadingProfile: false,
  isLoadingSettings: false,
  isLoadingWeight: false,
  isUpdatingSettings: false,
  isAddingWeight: false,
  isDeletingWeight: false,
  error: null,
};

export const useUserStore = create<UserStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      clearError: () => set({ error: null }),
      clearUserState: () => set({ ...initialState, isLoadingProfile: false }), // Reset on logout

      initializeUser: async () => {
        if (get().isLoadingProfile || get().isLoadingSettings) return;
        console.log("Initializing user data fetch...");
        set({ isLoadingProfile: true, isLoadingSettings: true, error: null });
        try {
             await Promise.all([ get().fetchUserProfile(), get().fetchSettings() ]);
        } catch (e) { console.error("Init fetch error", e); }
      },

      fetchUserProfile: async () => {
        // Set loading true ONLY if profile isn't already loading (prevents flicker during init)
        if(!get().isLoadingProfile) set({ isLoadingProfile: true, error: null });
        try {
          const response = await fetch('/api/user/profile');
          const result: ApiResponse<UserProfilePayload> = await response.json();
          if (!result.success) throw new Error(result.error.message);
          set({
            profile: result.data.user,
            settings: result.data.settings || get().settings,
            weightHistory: result.data.bodyweight || get().weightHistory,
            weightUnit: result.data.settings?.weightUnit || get().weightUnit,
            isLoadingProfile: false, // Always set loading false on finish
          });
        } catch (error: any) {
          console.error("fetchUserProfile Error:", error);
          set({ isLoadingProfile: false, error: error.message }); // Set loading false on error
        }
      },

      fetchSettings: async () => {
         if(!get().isLoadingSettings) set({ isLoadingSettings: true, error: null });
        try {
          const response = await fetch('/api/user/settings');
          const result: ApiResponse<UserSettingsPayload> = await response.json();
          if (!result.success) throw new Error(result.error.message);
          set({
            settings: result.data.settings,
            weightUnit: result.data.settings.weightUnit || 'kg',
            isLoadingSettings: false, // Set loading false on finish
          });
        } catch (error: any) {
          console.error("fetchSettings Error:", error);
          set({ isLoadingSettings: false, error: error.message }); // Set loading false on error
        }
      },

      updateSettings: async (newSettings) => {
        set({ isUpdatingSettings: true, error: null }); // Use specific flag
        try {
          const response = await fetch('/api/user/settings', { /* ... PUT options ... */ body: JSON.stringify({ settings: newSettings }) });
          const result: ApiResponse<UserSettingsPayload> = await response.json();
          if (!result.success) throw new Error(result.error.message);
          set({ settings: result.data.settings, weightUnit: result.data.settings.weightUnit || 'kg', isUpdatingSettings: false });
          return true;
        } catch (error: any) {
          console.error("updateSettings Error:", error);
          set({ isUpdatingSettings: false, error: error.message });
          return false;
        }
      },

      fetchWeightHistory: async (params = { limit: 30 }) => {
        set({ isLoadingWeight: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.append('limit', params.limit.toString());
          if (params.sort) queryParams.append('sort', params.sort);
          const response = await fetch(`/api/user/weight?${queryParams.toString()}`);
          const result: ApiResponse<WeightHistoryPayload> = await response.json();
          if (!result.success) throw new Error(result.error.message);
          set({ weightHistory: result.data.history, weightUnit: result.data.unit || get().weightUnit, isLoadingWeight: false });
        } catch (error: any) {
          console.error("fetchWeightHistory Error:", error);
          set({ isLoadingWeight: false, error: error.message });
        }
      },

      addWeightEntry: async (entryData) => {
        set({ isAddingWeight: true, error: null });
        try {
          const response = await fetch('/api/user/weight', { /* ... POST options ... */ body: JSON.stringify(entryData) });
          const result: ApiResponse<AddedWeightEntryPayload> = await response.json();
          if (!result.success) throw new Error(result.error.message);
          const newEntry = result.data.entry;
          set((state) => ({
            weightHistory: [newEntry, ...(state.weightHistory || [])]
                             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            isAddingWeight: false,
          }));
          return true;
        } catch (error: any) {
          console.error("addWeightEntry Error:", error);
          set({ isAddingWeight: false, error: error.message });
          return false;
        }
      },

      deleteWeightEntry: async (entryId) => {
        const originalHistory = get().weightHistory;
        set((state) => ({ weightHistory: (state.weightHistory || []).filter(entry => entry._id !== entryId), isDeletingWeight: true, error: null }));
        try {
          const response = await fetch(`/api/user/weight/${entryId}`, { method: 'DELETE' });
          if (!response.ok) {
              let errorMsg = 'Failed to delete entry'; try { const errRes = await response.json(); errorMsg = errRes?.error?.message || errorMsg; } catch(e){} throw new Error(errorMsg);
          }
          set({ isDeletingWeight: false }); return true; // Success
        } catch (error: any) {
          console.error("deleteWeightEntry Error:", error);
          set({ weightHistory: originalHistory, isDeletingWeight: false, error: error.message }); return false; // Revert on error
        }
      },
    }),
    { name: 'kalos-user-store' }
  )
);

// Selectors
export const useUserProfileData = () => useUserStore((state) => state.profile);
export const useUserSettingsData = () => useUserStore((state) => state.settings);