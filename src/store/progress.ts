import { create } from 'zustand';
import { ProgressCategory } from '@/lib/category-progress';
import { 
  ProgressResponseData, 
  CategoryProgressData, 
  AddXpResponseData,
  HistoryResponseData 
} from '@/types/api/progressResponses';
import { 
  WeightHistoryPayload, 
  AddedWeightEntryPayload 
} from '@/types/api/weightResponses';
import { ApiWeightEntry } from '@/types/api/userResponses';

// Base section interface for consistent error isolation
interface DataSection<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

// Weight trends calculation
interface WeightTrends {
  totalChange: number;
  period: number;
  weeklyRate: number;
  direction: 'gain' | 'loss' | 'maintain';
}

// Store state interface - ACHIEVEMENTS REMOVED
interface ProgressState {
  // Main progress overview
  progress: DataSection<ProgressResponseData>;
  
  // Category progress for Soma domain
  categoryProgress: DataSection<{
    core: CategoryProgressData;
    push: CategoryProgressData;
    pull: CategoryProgressData;
    legs: CategoryProgressData;
  }>;
  
  // Weight tracking
  weight: DataSection<{
    history: ApiWeightEntry[];
    trends: WeightTrends | null;
    unit: 'kg' | 'lbs';
  }>;
  
  // History/analytics
  history: DataSection<HistoryResponseData> & {
    timeRange: 'day' | 'week' | 'month' | 'year' | 'all';
    groupBy: 'day' | 'week' | 'month';
    category: string;
  };
  
  // Actions
  fetchProgress: () => Promise<void>;
  fetchCategoryProgress: () => Promise<void>;
  addXp: (amount: number, source: string, category?: ProgressCategory, details?: string) => Promise<AddXpResponseData | null>;
  fetchWeightHistory: () => Promise<void>;
  addWeightEntry: (weight: number, date?: Date) => Promise<void>;
  deleteWeightEntry: (entryId: string) => Promise<void>;
  fetchHistory: (timeRange?: string, groupBy?: string, category?: string) => Promise<void>;
  
  // Utility actions
  refreshAll: () => Promise<void>;
  clearError: (section: keyof Pick<ProgressState, 'progress' | 'categoryProgress' | 'weight' | 'history'>) => void;
}

// Helper to create empty data section
const createDataSection = <T>(): DataSection<T> => ({
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
});

// API base URL helper
const API_BASE = '/api';

export const useProgressStore = create<ProgressState>((set, get) => ({
  // Initial state - NO ACHIEVEMENTS
  progress: createDataSection<ProgressResponseData>(),
  categoryProgress: createDataSection<{
    core: CategoryProgressData;
    push: CategoryProgressData;
    pull: CategoryProgressData;
    legs: CategoryProgressData;
  }>(),
  weight: createDataSection<{
    history: ApiWeightEntry[];
    trends: WeightTrends | null;
    unit: 'kg' | 'lbs';
  }>(),
  history: {
    ...createDataSection<HistoryResponseData>(),
    timeRange: 'month',
    groupBy: 'day',
    category: 'all',
  },

  // Main progress data
  fetchProgress: async () => {
    set((state) => ({
      progress: { ...state.progress, isLoading: true, error: null }
    }));

    try {
      const response = await fetch(`${API_BASE}/progress`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch progress');
      }

      set((state) => ({
        progress: {
          data: result.data,
          isLoading: false,
          error: null,
          lastFetched: new Date(),
        }
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch progress';
      set((state) => ({
        progress: { ...state.progress, isLoading: false, error: errorMsg }
      }));
    }
  },

  // Category progress for all categories
  fetchCategoryProgress: async () => {
    set((state) => ({
      categoryProgress: { ...state.categoryProgress, isLoading: true, error: null }
    }));

    try {
      const response = await fetch(`${API_BASE}/progress/categories`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch category progress');
      }

      // Extract individual category data from the categories array
      const categoriesData = result.data.categories.reduce((acc: any, cat: any) => {
        acc[cat.category] = { level: cat.level, xp: cat.xp };
        return acc;
      }, {});

      set((state) => ({
        categoryProgress: {
          data: {
            core: categoriesData.core || { level: 1, xp: 0 },
            push: categoriesData.push || { level: 1, xp: 0 },
            pull: categoriesData.pull || { level: 1, xp: 0 },
            legs: categoriesData.legs || { level: 1, xp: 0 },
          },
          isLoading: false,
          error: null,
          lastFetched: new Date(),
        }
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch category progress';
      set((state) => ({
        categoryProgress: { ...state.categoryProgress, isLoading: false, error: errorMsg }
      }));
    }
  },

  // XP awarding - THE BIG ONE that other domains call
  addXp: async (amount: number, source: string, category?: ProgressCategory, details?: string) => {
    try {
      const response = await fetch(`${API_BASE}/progress/add-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xpAmount: amount,
          source,
          category,
          details,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to add XP');
      }

      // Refresh main progress after XP award
      get().fetchProgress();
      
      // If category XP was awarded, refresh category progress too
      if (category) {
        get().fetchCategoryProgress();
      }

      return result.data;
    } catch (error) {
      console.error('Failed to add XP:', error);
      return null;
    }
  },

  // Weight history
  fetchWeightHistory: async () => {
    set((state) => ({
      weight: { ...state.weight, isLoading: true, error: null }
    }));

    try {
      const response = await fetch(`${API_BASE}/progress/weight?limit=50`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch weight history');
      }

      const payload: WeightHistoryPayload = result.data;

      set({
        weight: {
          data: {
            history: payload.history,
            trends: payload.trends as WeightTrends | null,
            unit: payload.unit,
          },
          isLoading: false,
          error: null,
          lastFetched: new Date(),
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch weight history';
      set((state) => ({
        weight: { ...state.weight, isLoading: false, error: errorMsg }
      }));
    }
  },

  // Add weight entry
  addWeightEntry: async (weight: number, date?: Date) => {
    try {
      const response = await fetch(`${API_BASE}/progress/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight,
          date: date?.toISOString(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to add weight entry');
      }

      // Refresh weight history after adding
      get().fetchWeightHistory();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add weight entry';
      set((state) => ({
        weight: { ...state.weight, error: errorMsg }
      }));
    }
  },

  // Delete weight entry
  deleteWeightEntry: async (entryId: string) => {
    try {
      const response = await fetch(`${API_BASE}/progress/weight/${entryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete weight entry');
      }

      // Refresh weight history after deleting
      get().fetchWeightHistory();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete weight entry';
      set((state) => ({
        weight: { ...state.weight, error: errorMsg }
      }));
    }
  },

  // Progress history
  fetchHistory: async (timeRange = 'month', groupBy = 'day', category = 'all') => {
    set((state) => ({
      history: { 
        ...state.history, 
        isLoading: true, 
        error: null,
        timeRange: timeRange as any,
        groupBy: groupBy as any,
        category,
      }
    }));

    try {
      const params = new URLSearchParams({
        timeRange,
        groupBy,
        ...(category !== 'all' && { category }),
      });

      const response = await fetch(`${API_BASE}/progress/history?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch progress history');
      }

      set((state) => ({
        history: {
          ...state.history,
          data: result.data,
          isLoading: false,
          error: null,
          lastFetched: new Date(),
        }
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch progress history';
      set((state) => ({
        history: { ...state.history, isLoading: false, error: errorMsg }
      }));
    }
  },

  // Utility: refresh all data (NO MORE ACHIEVEMENTS)
  refreshAll: async () => {
    const { fetchProgress, fetchCategoryProgress, fetchWeightHistory, fetchHistory } = get();
    
    await Promise.allSettled([
      fetchProgress(),
      fetchCategoryProgress(),
      fetchWeightHistory(),
      fetchHistory(),
    ]);
  },

  // Utility: clear specific section error
  clearError: (section) => {
    set((state) => ({
      [section]: { ...state[section], error: null }
    }));
  },
}));