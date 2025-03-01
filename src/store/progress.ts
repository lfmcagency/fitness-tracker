import { create } from 'zustand';

interface ProgressState {
  performanceData: any[];
  achievements: any[];
  currentWeight: number;
  weightChange: number;
  maxPushups: number;
  pushupChange: number;
  trainingDays: number;
  isLoading: boolean;
  error: string | null;
  fetchProgressData: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  performanceData: [
    { date: "02/10", pushups: 18, pullups: 10, weight: 76.2 },
    { date: "02/12", pushups: 20, pullups: 11, weight: 75.8 },
    { date: "02/14", pushups: 19, pullups: 12, weight: 75.5 },
    { date: "02/16", pushups: 22, pullups: 12, weight: 75.2 },
    { date: "02/17", pushups: 23, pullups: 13, weight: 75.5 },
  ],
  achievements: [
    { id: 1, title: "20+ Push-ups", date: "Feb 12", type: "strength" },
    { id: 2, title: "Sub 76kg Weight", date: "Feb 14", type: "weight" },
    { id: 3, title: "10+ Pull-ups", date: "Feb 10", type: "strength" },
  ],
  currentWeight: 75.5,
  weightChange: -0.7,
  maxPushups: 23,
  pushupChange: 3,
  trainingDays: 5,
  isLoading: false,
  error: null,

  fetchProgressData: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real implementation, this would be a fetch request to an API
      // For now, we'll just simulate a delay and use the static data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // No change to the data for now, just reset loading state
      set({ isLoading: false });
    } catch (error) {
      console.error('Error fetching progress data:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch progress data', 
        isLoading: false 
      });
    }
  }
}));