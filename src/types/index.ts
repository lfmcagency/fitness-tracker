// Daily Routine Types
export interface Task {
    id: number;
    name: string;
    time: string;
    completed: boolean;
    streak: number;
  }
  
  // Training Types
  export interface ExerciseSet {
    reps: number;
    completed: boolean;
  }
  
  export interface LastSession {
    maxReps: number;
    totalVolume: number;
  }
  
  export interface Exercise {
    id: number;
    name: string;
    sets: ExerciseSet[];
    lastSession: LastSession;
    restTime: number;
  }
  
  // Nutrition Types
  export interface MacroGoals {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  }
  
  export interface Food {
    name: string;
    amount: number;
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  }
  
  export interface Meal {
    id: number;
    name: string;
    time: string;
    foods: Food[];
  }
  
  // Progress Dashboard Types
  export interface PerformanceData {
    date: string;
    pushups: number;
    pullups: number;
    weight: number;
  }
  
  export interface Achievement {
    id: number;
    title: string;
    date: string;
    type: 'strength' | 'weight';
  }