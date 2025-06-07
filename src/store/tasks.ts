import { create } from 'zustand';
import type { TaskData, RecurrencePattern, TaskPriority } from '@/types';

// Simple creation parameters
export interface CreateTaskParams {
  name: string;
  scheduledTime: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  category?: string;
  priority?: TaskPriority;
  description?: string;
}

// Dead simple state
interface TaskState {
  // Core state
  tasks: TaskData[];
  selectedDate: string; // YYYY-MM-DD format
  isLoading: boolean;
  error: string | null;
  
  // Actions - simple and focused
  setSelectedDate: (date: string) => void;
  fetchTasksForDate: (date: string) => Promise<void>;
  createTask: (taskData: CreateTaskParams) => Promise<TaskData | null>;
  updateTask: (taskId: string, updates: Partial<TaskData>) => Promise<TaskData | null>;
  completeTask: (taskId: string, completed: boolean, date?: string) => Promise<TaskData | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  
  // Helpers
  clearError: () => void;
  getTasksForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => TaskData[];
}

// Time block logic - moved out of components
function getTimeBlockForScheduledTime(scheduledTime: string): 'morning' | 'afternoon' | 'evening' {
  const [hours] = scheduledTime.split(':').map(Number);
  
  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  return 'evening';
}

// Helper to format today's date in local timezone
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  selectedDate: getTodayString(),
  isLoading: false,
  error: null,

  /**
   * Set the selected date and fetch tasks for it
   */
  setSelectedDate: (date: string) => {
    console.log('📅 [STORE] Setting selected date:', date);
    set({ selectedDate: date });
    get().fetchTasksForDate(date);
  },

  /**
   * Fetch tasks for a specific date - uses our bulletproof endpoint
   */
  fetchTasksForDate: async (date: string) => {
    console.log('🔄 [STORE] Fetching tasks for date:', date);
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/tasks/due?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const tasks = data.data || [];
        console.log(`✅ [STORE] Loaded ${tasks.length} tasks for ${date}`);
        
        set({ 
          tasks,
          isLoading: false,
          selectedDate: date // Ensure date is synced
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('💥 [STORE] Error fetching tasks:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
        tasks: [] // Clear tasks on error
      });
    }
  },

  /**
   * Create a new task - no temp IDs, just wait for response
   */
  createTask: async (taskData: CreateTaskParams) => {
    console.log('➕ [STORE] Creating task:', taskData.name);
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          date: get().selectedDate // Use current selected date
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newTask = data.data;
        console.log('✅ [STORE] Task created:', newTask.id);
        
        // Add to current tasks if it's for the selected date
        const selectedDate = get().selectedDate;
        if (newTask.date?.startsWith(selectedDate) || !newTask.date) {
          set((state) => ({
            tasks: [...state.tasks, newTask],
            isLoading: false
          }));
        } else {
          // Task created for different date, just stop loading
          set({ isLoading: false });
        }
        
        return newTask;
      } else {
        throw new Error(data.error?.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('💥 [STORE] Error creating task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create task',
        isLoading: false 
      });
      return null;
    }
  },

  /**
   * Update a task - wait for server response
   */
  updateTask: async (taskId: string, updates: Partial<TaskData>) => {
    console.log('✏️ [STORE] Updating task:', taskId, updates);
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Handle both TaskData and { task: TaskData } response formats
        const updatedTask = 'task' in data.data ? data.data.task : data.data;
        console.log('✅ [STORE] Task updated:', updatedTask.id);
        
        // Update in local state
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId ? updatedTask : task
          ),
          isLoading: false
        }));
        
        return updatedTask;
      } else {
        throw new Error(data.error?.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('💥 [STORE] Error updating task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update task',
        isLoading: false 
      });
      return null;
    }
  },

  /**
   * Complete/uncomplete a task for specific date
   */
  completeTask: async (taskId: string, completed: boolean, date?: string) => {
    const completionDate = date || get().selectedDate;
    console.log(`${completed ? '✅' : '❌'} [STORE] ${completed ? 'Completing' : 'Uncompleting'} task:`, taskId, 'for date:', completionDate);
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          completed,
          completionDate 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${completed ? 'complete' : 'uncomplete'} task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Handle both TaskData and { task: TaskData } response formats
        const updatedTask = 'task' in data.data ? data.data.task : data.data;
        console.log(`✅ [STORE] Task ${completed ? 'completed' : 'uncompleted'}:`, updatedTask.id);
        
        // Update in local state
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId ? updatedTask : task
          ),
          isLoading: false
        }));
        
        return updatedTask;
      } else {
        throw new Error(data.error?.message || `Failed to ${completed ? 'complete' : 'uncomplete'} task`);
      }
    } catch (error) {
      console.error(`💥 [STORE] Error ${completed ? 'completing' : 'uncompleting'} task:`, error);
      set({ 
        error: error instanceof Error ? error.message : `Failed to ${completed ? 'complete' : 'uncomplete'} task`,
        isLoading: false 
      });
      return null;
    }
  },

  /**
   * Delete a task
   */
  deleteTask: async (taskId: string) => {
    console.log('🗑️ [STORE] Deleting task:', taskId);
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [STORE] Task deleted:', taskId);
        
        // Remove from local state
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== taskId),
          isLoading: false
        }));
        
        return true;
      } else {
        throw new Error(data.error?.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('💥 [STORE] Error deleting task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete task',
        isLoading: false 
      });
      return false;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Get tasks for a specific time block
   */
  getTasksForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => {
    const tasks = get().tasks;
    return tasks.filter(task => {
      const taskTimeBlock = getTimeBlockForScheduledTime(task.scheduledTime);
      return taskTimeBlock === timeBlock;
    });
  }
}));