// stores/user.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { UserProfile } from '@/types/api/authResponses';

interface UserStore {
  // Auth state
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Profile data
  bodyweightEntries: Array<{weight: number, date: string}>;
  settings: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit: 'cm' | 'in';
    theme?: string;
  };
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addBodyweightEntry: (weight: number, date?: string) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    devtools(
      (set, get) => ({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        bodyweightEntries: [],
        settings: {
          weightUnit: 'kg',
          lengthUnit: 'cm'
        },
        login: async (email: string, password: string) => {
          return false;
        },
        logout: async () => {
          set({ isAuthenticated: false, user: null });
        },
        getProfile: async () => {
          // Implement profile fetching
        },
        updateProfile: async (data: Partial<UserProfile>) => {
          // Implement profile update
        },
        addBodyweightEntry: async (weight: number, date?: string) => {
          const entry = { weight, date: date || new Date().toISOString() };
          set((state) => ({
            bodyweightEntries: [...state.bodyweightEntries, entry]
          }));
        }
      })
    ),
    { name: 'user-storage' }
  )
);