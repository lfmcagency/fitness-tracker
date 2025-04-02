// src/store/user.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UserProfilePayload, IUserProfileData, ApiWeightEntry } from '@/types/api/userResponses';
import { UserSettingsPayload, UpdateUserSettingsRequest } from '@/types/api/settingsResponses';
import { WeightHistoryPayload, AddWeightEntryRequest, AddedWeightEntryPayload } from '@/types/api/weightResponses';
import { IUserSettings, IWeightEntry as DbWeightEntry } from '@/types/models/user';
// Import common types needed for API call results
import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/types/api/common';

// Define the state shape using API response types where appropriate
interface UserStoreState {
  profile: IUserProfileData | null; // Holds the 'user' part of the profile payload
  settings: IUserSettings | null;
  weightHistory: ApiWeightEntry[] | null; // Use API type with string dates/IDs
  weightUnit: 'kg' | 'lbs'; // Keep readily accessible

  isLoadingProfile: boolean;
  isLoadingSettings: boolean; // Loading for initial fetch
  isLoadingWeight: boolean;
  isUpdatingSettings: boolean; // Loading for PUT operation
  isAddingWeight: boolean;
  isDeletingWeight: boolean;

  error: string | null; // Store only error message string
}

// Define actions
interface UserStoreActions {
  initializeUser: () => Promise<void>; // Fetch initial data on app load/login
  fetchUserProfile: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<IUserSettings>) => Promise<boolean>; // Returns true on success
  fetchWeightHistory: (params?: { limit?: number; sort?: 'asc' | 'desc' }) => Promise<void>;
  addWeightEntry: (entryData: AddWeightEntryRequest) => Promise<boolean>; // Returns true on success
  deleteWeightEntry: (entryId: string) => Promise<boolean>; // Returns true on success
  clearError: () => void;
  clearUserState: () => void; // For logout
}

// Define the store combining state and actions
type UserStore = UserStoreState & UserStoreActions;

// Initial state
const initialState: UserStoreState = {
  profile: null,
  settings: null,
  weightHistory: null,
  weightUnit: 'kg', // Default until settings are loaded
  isLoadingProfile: false,
  isLoadingSettings: false,
  isLoadingWeight: false,
  isUpdatingSettings: false,
  isAddingWeight: false,
  isDeletingWeight: false,
  error: null,
};

// Create the store
export const useUserStore = create<UserStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // --- Actions Implementation ---

      clearError: () => set({ error: null }),

      clearUserState: () => {
          console.log("Clearing user state (Zustand)");
          set({ ...initialState, isLoadingProfile: false }); // Reset state on logout
      },

      initializeUser: async () => {
        // Avoid multiple concurrent fetches if already loading
        if (get().isLoadingProfile || get().isLoadingSettings) {
            console.log("Initialization already in progress, skipping.");
            return;
        }
        console.log("Initializing user data fetch...");
        set({ isLoadingProfile: true, isLoadingSettings: true, error: null }); // Indicate loading start
        try {
             // Fetch concurrently
             await Promise.all([
                 get().fetchUserProfile(), // Should set isLoadingProfile false itself
                 get().fetchSettings()     // Should set isLoadingSettings false itself
                 // Optional: get().fetchWeightHistory()
             ]);
             console.log("User data initialization fetches complete.");
        } catch (e) {
            // Errors are handled and logged within individual fetch functions
            console.error("Initialization fetch error caught in Promise.all (see specific function logs)", e)
            // Ensure loading flags are reset even if one promise rejects
             set(state => ({
                isLoadingProfile: state.isLoadingProfile ? false : state.isLoadingProfile,
                isLoadingSettings: state.isLoadingSettings ? false : state.isLoadingSettings,
            }));
        }
      },

      // --- Fetch Profile ---
      fetchUserProfile: async () => {
        // Set loading true ONLY if profile isn't already loading (prevents flicker during init)
        if(!get().isLoadingProfile) set({ isLoadingProfile: true, error: null });
        console.log("Fetching user profile...");
        try {
          const response = await fetch('/api/user/profile');
          const result: ApiResponse<UserProfilePayload> = await response.json();

          if (!result.success) { // Check common success flag
            throw new Error(result.error.message || 'Failed to fetch profile');
          }
          // result.data should be UserProfilePayload
          console.log("User profile fetched successfully:", result.data);
          set({
            profile: result.data.user,
            settings: result.data.settings || get().settings, // Update settings if included
            weightHistory: result.data.bodyweight || get().weightHistory, // Update weight if included
            weightUnit: result.data.settings?.weightUnit || get().weightUnit, // Update shortcut unit
            isLoadingProfile: false, // Always set loading false on finish
          });
        } catch (error: any) {
          console.error("fetchUserProfile Error:", error);
          set({ isLoadingProfile: false, error: error.message }); // Set loading false on error
        }
      },

      // --- Fetch Settings ---
      fetchSettings: async () => {
         if(!get().isLoadingSettings) set({ isLoadingSettings: true, error: null });
         console.log("Fetching settings...");
        try {
          const response = await fetch('/api/user/settings');
          const result: ApiResponse<UserSettingsPayload> = await response.json();

          if (!result.success) {
            throw new Error(result.error.message || 'Failed to fetch settings');
          }
          // result.data should be UserSettingsPayload
          console.log("Settings fetched successfully:", result.data.settings);
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

      // --- Update Settings ---
      updateSettings: async (newSettings) => {
        set({ isUpdatingSettings: true, error: null }); // Use specific flag
        console.log("Updating settings with:", newSettings);
        try {
          const response = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: newSettings }), // Body requires { settings: ... }
          });
          const result: ApiResponse<UserSettingsPayload> = await response.json();

          if (!result.success) {
            throw new Error(result.error.message || 'Failed to update settings');
          }
          // result.data should be UserSettingsPayload containing updated settings
          console.log("Settings updated successfully:", result.data.settings);
          set({
            settings: result.data.settings,
            weightUnit: result.data.settings.weightUnit || 'kg',
            isUpdatingSettings: false,
          });
          return true; // Indicate success
        } catch (error: any) {
          console.error("updateSettings Error:", error);
          set({ isUpdatingSettings: false, error: error.message });
          return false; // Indicate failure
        }
      },

      // --- Fetch Weight History ---
      fetchWeightHistory: async (params = { limit: 30 }) => {
        set({ isLoadingWeight: true, error: null });
        console.log("Fetching weight history with params:", params);
        try {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.append('limit', params.limit.toString());
          if (params.sort) queryParams.append('sort', params.sort);

          const response = await fetch(`/api/user/weight?${queryParams.toString()}`);
          const result: ApiResponse<WeightHistoryPayload> = await response.json();

          if (!result.success) {
            throw new Error(result.error.message || 'Failed to fetch weight history');
          }
          // result.data should be WeightHistoryPayload
          console.log(`Weight history fetched successfully (${result.data.history.length} entries)`);
          set({
            weightHistory: result.data.history, // Already ApiWeightEntry[]
            weightUnit: result.data.unit || get().weightUnit, // Update unit if API returns it
            isLoadingWeight: false,
          });
        } catch (error: any) {
          console.error("fetchWeightHistory Error:", error);
          set({ isLoadingWeight: false, error: error.message });
        }
      },

      // --- Add Weight Entry ---
      addWeightEntry: async (entryData) => {
        set({ isAddingWeight: true, error: null });
        console.log("Adding weight entry:", entryData);
        try {
          const response = await fetch('/api/user/weight', {
            method: 'POST', // Ensure POST
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
          });
          const result: ApiResponse<AddedWeightEntryPayload> = await response.json();

          if (!result.success) {
            throw new Error(result.error.message || 'Failed to add weight entry');
          }
          // result.data should be AddedWeightEntryPayload
          const newEntry = result.data.entry; // This is ApiWeightEntry
          console.log("Weight entry added successfully:", newEntry);

          // Optimistic update: Add new entry to the start of the list
          set((state) => ({
            weightHistory: [newEntry, ...(state.weightHistory || [])]
                             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), // Keep sorted desc
            isAddingWeight: false,
          }));
          return true; // Indicate success
        } catch (error: any) {
          console.error("addWeightEntry Error:", error);
          set({ isAddingWeight: false, error: `Add weight error: ${error.message}` });
          return false; // Indicate failure
        }
      },

      // --- Delete Weight Entry ---
      deleteWeightEntry: async (entryId) => {
        // Optimistic update: Remove immediately for better UX
        const originalHistory = get().weightHistory;
        set((state) => ({
            weightHistory: (state.weightHistory || []).filter(entry => entry._id !== entryId),
            isDeletingWeight: true, // Indicate deletion process start
            error: null
        }));
        console.log(`Attempting to delete weight entry: ${entryId}`);

        try {
          const response = await fetch(`/api/user/weight/${entryId}`, { method: 'DELETE' });

          // Check if the deletion failed on the server
          if (!response.ok) {
              let errorMsg = 'Failed to delete weight entry';
              try { const errorResult: ApiErrorResponse = await response.json(); errorMsg = errorResult.error.message || errorMsg; } catch (e) { /* Ignore parsing error if body is not JSON */ }
              throw new Error(errorMsg);
          }

          // Success: state already updated optimistically
          console.log(`Weight entry ${entryId} deleted successfully (optimistic).`);
          set({ isDeletingWeight: false });
          return true;

        } catch (error: any) {
          console.error("deleteWeightEntry Error:", error);
          // Revert state if deletion failed
          set({ weightHistory: originalHistory, isDeletingWeight: false, error: error.message });
          return false; // Indicate failure
        }
      },
    }),
    // Store Name (optional, for devtools)
    { name: 'kalos-user-store' }
  )
);

// Selectors (optional but can be useful)
export const useUserProfileData = () => useUserStore((state) => state.profile);
export const useUserSettingsData = () => useUserStore((state) => state.settings);
export const useUserWeightUnit = () => useUserStore((state) => state.weightUnit);