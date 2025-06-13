import { create } from 'zustand';
import type { TaskData, RecurrencePattern, TaskPriority, DomainCategory } from '@/types';

// UPDATED: Creation parameters with new architecture fields
export interface CreateTaskParams {
  name: string;
  scheduledTime: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  domainCategory?: DomainCategory; // NEW
  labels?: string[]; // NEW
  category?: string;
  priority?: TaskPriority;
  description?: string;
  isSystemTask?: boolean; // NEW (usually false for user-created tasks)
}

// NEW: Achievement notification interface
export interface AchievementNotification {
  unlockedCount: number;
  achievements: string[];
  message?: string;
}

// UPDATED: Enhanced state with achievement handling
interface TaskState {
  // Core state
  tasks: TaskData[];
  selectedDate: string; // YYYY-MM-DD format
  isLoading: boolean;
  error: string | null;
  
  // NEW: Achievement notifications
  recentAchievements: AchievementNotification | null;
  
  // Actions - enhanced for new architecture
  setSelectedDate: (date: string) => void;
  fetchTasksForDate: (date: string) => Promise<void>;
  createTask: (taskData: CreateTaskParams) => Promise<TaskData | null>;
  updateTask: (taskId: string, updates: Partial<TaskData>) => Promise<TaskData | null>;
  completeTask: (taskId: string, completed: boolean, date?: string) => Promise<{ task: TaskData | null; achievements?: AchievementNotification }>;
  deleteTask: (taskId: string) => Promise<boolean>;
  
  // NEW: Organization helpers
  getTasksByDomain: (domain: DomainCategory) => TaskData[];
  getTasksByLabels: (labels: string[]) => TaskData[];
  getSystemTasks: () => TaskData[];
  getUserTasks: () => TaskData[];
  
  // Helpers
  clearError: () => void;
  clearAchievements: () => void;
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

// Helper to extract achievement notifications from API response
function extractAchievements(responseData: any): AchievementNotification | null {
  if (responseData?.achievements?.unlockedCount > 0) {
    return {
      unlockedCount: responseData.achievements.unlockedCount,
      achievements: responseData.achievements.achievements || [],
      message: `🎉 ${responseData.achievements.unlockedCount} achievement(s) unlocked!`
    };
  }
  return null;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  selectedDate: getTodayString(),
  isLoading: false,
  error: null,
  recentAchievements: null,

  /**
   * Set the selected date and fetch tasks for it
   */
  setSelectedDate: (date: string) => {
    console.log('📅 [STORE] Setting selected date:', date);
    set({ selectedDate: date, recentAchievements: null }); // Clear achievements on date change
    get().fetchTasksForDate(date);
  },

  /**
   * Fetch tasks for a specific date - enhanced with new fields
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
        
        // Log new fields for debugging
        const systemTasks = tasks.filter((t: TaskData) => t.isSystemTask);
        const domainBreakdown = tasks.reduce((acc: Record<string, number>, t: TaskData) => {
          acc[t.domainCategory] = (acc[t.domainCategory] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📊 [STORE] Task breakdown:', {
          total: tasks.length,
          systemTasks: systemTasks.length,
          domains: domainBreakdown
        });
        
        set({ 
          tasks,
          isLoading: false,
          selectedDate: date
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('💥 [STORE] Error fetching tasks:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
        tasks: []
      });
    }
  },

  /**
   * Create a new task - enhanced with new fields
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
          date: get().selectedDate, // Use current selected date
          domainCategory: taskData.domainCategory || 'ethos', // Default to ethos
          labels: taskData.labels || [], // Default to empty array
          isSystemTask: taskData.isSystemTask || false // Default to false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newTask = data.data;
        console.log('✅ [STORE] Task created:', newTask.id);
        console.log('🏷️ [STORE] Task details:', {
          domainCategory: newTask.domainCategory,
          labels: newTask.labels,
          isSystemTask: newTask.isSystemTask
        });
        
        // Add to current tasks if it's for the selected date
        const selectedDate = get().selectedDate;
        if (newTask.date?.startsWith(selectedDate) || !newTask.date) {
          set((state) => ({
            tasks: [...state.tasks, newTask],
            isLoading: false
          }));
        } else {
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
   * Update a task - enhanced for new fields
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
        
        // Check for achievements from coordinator
        const achievements = extractAchievements(data.data);
        if (achievements) {
          console.log('🏆 [STORE] Achievements unlocked:', achievements);
        }
        
        // Update in local state
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId ? updatedTask : task
          ),
          isLoading: false,
          recentAchievements: achievements
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
   * Complete/uncomplete a task - enhanced with achievement handling
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
        console.log('📊 [STORE] Updated metrics:', {
          currentStreak: updatedTask.currentStreak,
          totalCompletions: updatedTask.totalCompletions
        });
        
        // Check for achievements from coordinator
        const achievements = extractAchievements(data.data);
        if (achievements) {
          console.log('🏆 [STORE] Achievements unlocked:', achievements);
        }
        
      // Update in local state
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === taskId ? updatedTask : task
          ),
          isLoading: false,
          recentAchievements: achievements
        }));
        
        return { task: updatedTask, achievements: achievements || undefined };
      } else {
        throw new Error(data.error?.message || `Failed to ${completed ? 'complete' : 'uncomplete'} task`);
      }
    } catch (error) {
      console.error(`💥 [STORE] Error ${completed ? 'completing' : 'uncompleting'} task:`, error);
      set({ 
        error: error instanceof Error ? error.message : `Failed to ${completed ? 'complete' : 'uncomplete'} task`,
        isLoading: false 
      });
      return { task: null };
    }
  },

  /**
   * Delete a task - enhanced with system task protection
   */
  deleteTask: async (taskId: string) => {
    console.log('🗑️ [STORE] Deleting task:', taskId);
    
    // Check if it's a system task first
    const task = get().tasks.find(t => t.id === taskId);
    if (task?.isSystemTask) {
      set({ error: 'System tasks cannot be deleted' });
      return false;
    }
    
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
   * NEW: Get tasks by domain category
   */
  getTasksByDomain: (domain: DomainCategory) => {
    const tasks = get().tasks;
    return tasks.filter(task => task.domainCategory === domain);
  },

  /**
   * NEW: Get tasks by labels
   */
  getTasksByLabels: (labels: string[]) => {
    const tasks = get().tasks;
    return tasks.filter(task => 
      labels.some(label => task.labels.includes(label))
    );
  },

  /**
   * NEW: Get system tasks only
   */
  getSystemTasks: () => {
    const tasks = get().tasks;
    return tasks.filter(task => task.isSystemTask);
  },

  /**
   * NEW: Get user tasks only (non-system)
   */
  getUserTasks: () => {
    const tasks = get().tasks;
    return tasks.filter(task => !task.isSystemTask);
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * NEW: Clear achievement notifications
   */
  clearAchievements: () => {
    set({ recentAchievements: null });
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