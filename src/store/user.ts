// src/store/user.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UserProfilePayload, IUserProfileData } from '@/types/api/userResponses';
import { UserSettingsPayload, UpdateUserSettingsRequest } from '@/types/api/settingsResponses';
import { IUserSettings } from '@/types/models/user';
// Import common types needed for API call results
import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/types/api/common';

// Define the state shape using API response types where appropriate
interface UserStoreState {
  profile: IUserProfileData | null; // Holds the 'user' part of the profile payload
  settings: IUserSettings | null;
  weightUnit: 'kg' | 'lbs'; // Keep readily accessible from settings

  isLoadingProfile: boolean;
  isLoadingSettings: boolean; // Loading for initial fetch
  isUpdatingSettings: boolean; // Loading for PUT operation

  error: string | null; // Store only error message string
}

// Define actions
interface UserStoreActions {
  initializeUser: () => Promise<void>; // Fetch initial data on app load/login
  fetchUserProfile: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<IUserSettings>) => Promise<boolean>; // Returns true on success
  clearError: () => void;
  clearUserState: () => void; // For logout
}

// Define the store combining state and actions
type UserStore = UserStoreState & UserStoreActions;

// Initial state
const initialState: UserStoreState = {
  profile: null,
  settings: null,
  weightUnit: 'kg', // Default until settings are loaded
  isLoadingProfile: false,
  isLoadingSettings: false,
  isUpdatingSettings: false,
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
    }),
    // Store Name (optional, for devtools)
    { name: 'kalos-user-store' }
  )
);

// Selectors (optional but can be useful)
export const useUserProfileData = () => useUserStore((state) => state.profile);
export const useUserSettingsData = () => useUserStore((state) => state.settings);
export const useUserWeightUnit = () => useUserStore((state) => state.weightUnit);