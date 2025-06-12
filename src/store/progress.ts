// src/store/progress.ts
import { create } from 'zustand';
import { ProgressCategory } from '@/lib/category-progress';
import { 
  ProgressOverviewData,
  WeightEntryData,
  ProgressHistoryData,
  ProgressEventContract,
  XpAwardResult
} from '@/types/api/progressResponses';

// Clean data section interface
interface DataSection<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

// Store state - achievements removed, events added
interface ProgressState {
  // Core progress data
  overview: DataSection<ProgressOverviewData>;
  
  // Weight tracking  
  weight: DataSection<{
    entries: WeightEntryData[];
    trends: {
      totalChange: number;
      period: number;
      weeklyRate: number;
      direction: 'gain' | 'loss' | 'maintain';
    } | null;
    unit: 'kg' | 'lb';
  }>;
  
  // History for charts
  history: DataSection<ProgressHistoryData> & {
    timeRange: 'day' | 'week' | 'month' | 'year';
    groupBy: 'day' | 'week' | 'month';
    category: string;
  };
  
  // Event firing methods (what other domains call)
  fireProgressEvent: (contract: Omit<ProgressEventContract, 'userId'>) => Promise<XpAwardResult | null>;
  
  // Data fetching (for dashboard display)
  fetchOverview: () => Promise<void>;
  fetchWeightHistory: () => Promise<void>;
  fetchHistory: (timeRange?: string, groupBy?: string, category?: string) => Promise<void>;
  
  // Weight management
  addWeightEntry: (weight: number, date?: Date) => Promise<void>;
  deleteWeightEntry: (entryId: string) => Promise<void>;
  
  // Utilities
  refreshAll: () => Promise<void>;
  clearError: (section: keyof Pick<ProgressState, 'overview' | 'weight' | 'history'>) => void;
}

// Helper to create empty data section
const createDataSection = <T>(): DataSection<T> => ({
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
});

const API_BASE = '/api';

export const useProgressStore = create<ProgressState>((set, get) => ({
  // Initial state - clean and simple
  overview: createDataSection<ProgressOverviewData>(),
  weight: createDataSection<{
    entries: WeightEntryData[];
    trends: any;
    unit: 'kg' | 'lb';
  }>(),
  history: {
    ...createDataSection<ProgressHistoryData>(),
    timeRange: 'month',
    groupBy: 'day',
    category: 'all',
  },

  // ==========================================
  // EVENT FIRING (what other domains call)
  // ==========================================
  
  fireProgressEvent: async (contractData) => {
    try {
      console.log('[Progress Store] Firing progress event:', contractData);
      
      const response = await fetch(`${API_BASE}/progress/add-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to process progress event');
      }

      // Auto-refresh overview after XP award
      get().fetchOverview();
      
      console.log('[Progress Store] Progress event complete:', result.data);
      return result.data;
    } catch (error) {
      console.error('[Progress Store] Failed to fire progress event:', error);
      return null;
    }
  },

  // ==========================================
  // DATA FETCHING (for display)
  // ==========================================

  fetchOverview: async () => {
    set((state) => ({
      overview: { ...state.overview, isLoading: true, error: null }
    }));

    try {
      const response = await fetch(`${API_BASE}/progress`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch progress overview');
      }

      set({
        overview: {
          data: result.data,
          isLoading: false,
          error: null,
          lastFetched: new Date(),
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch overview';
      set((state) => ({
        overview: { ...state.overview, isLoading: false, error: errorMsg }
      }));
    }
  },

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

      set({
        weight: {
          data: {
            entries: result.data.history || [],
            trends: result.data.trends || null,
            unit: result.data.unit || 'kg',
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

  // ==========================================
  // WEIGHT MANAGEMENT
  // ==========================================

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

      // Refresh weight history
      get().fetchWeightHistory();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add weight entry';
      set((state) => ({
        weight: { ...state.weight, error: errorMsg }
      }));
    }
  },

  deleteWeightEntry: async (entryId: string) => {
    try {
      const response = await fetch(`${API_BASE}/progress/weight/${entryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete weight entry');
      }

      // Refresh weight history
      get().fetchWeightHistory();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete weight entry';
      set((state) => ({
        weight: { ...state.weight, error: errorMsg }
      }));
    }
  },

  // ==========================================
  // UTILITIES
  // ==========================================

  refreshAll: async () => {
    const { fetchOverview, fetchWeightHistory, fetchHistory } = get();
    
    await Promise.allSettled([
      fetchOverview(),
      fetchWeightHistory(),
      fetchHistory(),
    ]);
  },

  clearError: (section) => {
    set((state) => ({
      [section]: { ...state[section], error: null }
    }));
  },
}));