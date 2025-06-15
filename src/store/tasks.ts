import { create } from 'zustand';
import type { TaskData, RecurrencePattern, TaskPriority, DomainCategory } from '@/types';

// NEW: Use shared utilities instead of duplicating code
import { 
  apiGet, 
  apiPost, 
  apiPatch, 
  apiDelete,
  ApiError,
  getTodayString,
  getTimeBlockForTime,
  extractAchievements,
  type AchievementNotification
} from '@/lib/shared-utilities';

// UPDATED: Creation parameters with new architecture fields
export interface CreateTaskParams {
  name: string;
  scheduledTime: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  domainCategory?: DomainCategory;
  labels?: string[];
  category?: string;
  priority?: TaskPriority;
  description?: string;
  isSystemTask?: boolean;
}

// UPDATED: Enhanced state with achievement handling
interface TaskState {
  // Core state
  tasks: TaskData[];
  selectedDate: string; // YYYY-MM-DD format
  isLoading: boolean;
  error: string | null;
  
  // Achievement notifications
  recentAchievements: AchievementNotification | null;
  
  // Actions - enhanced for new architecture
  setSelectedDate: (date: string) => void;
  fetchTasksForDate: (date: string) => Promise<void>;
  createTask: (taskData: CreateTaskParams) => Promise<TaskData | null>;
  updateTask: (taskId: string, updates: Partial<TaskData>) => Promise<TaskData | null>;
  completeTask: (taskId: string, completed: boolean, date?: string) => Promise<{ task: TaskData | null; achievements?: AchievementNotification }>;
  deleteTask: (taskId: string) => Promise<boolean>;
  
  // Organization helpers
  getTasksByDomain: (domain: DomainCategory) => TaskData[];
  getTasksByLabels: (labels: string[]) => TaskData[];
  getSystemTasks: () => TaskData[];
  getUserTasks: () => TaskData[];
  
  // Helpers
  clearError: () => void;
  clearAchievements: () => void;
  getTasksForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => TaskData[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  selectedDate: getTodayString(), // Using shared utility
  isLoading: false,
  error: null,
  recentAchievements: null,

  /**
   * Set the selected date and fetch tasks for it
   */
  setSelectedDate: (date: string) => {
    console.log('📅 [STORE] Setting selected date:', date);
    set({ selectedDate: date, recentAchievements: null });
    get().fetchTasksForDate(date);
  },

  /**
   * Fetch tasks for a specific date - enhanced with new fields
   */
  fetchTasksForDate: async (date: string) => {
    console.log('🔄 [STORE] Fetching tasks for date:', date);
    
    set({ isLoading: true, error: null });
    
    try {
      // Using shared API utility instead of manual fetch
      const data = await apiGet<TaskData[]>(`/api/tasks/due`, { date });
      
      console.log(`✅ [STORE] Loaded ${data.length} tasks for ${date}`);
      
      // Log new fields for debugging
      const systemTasks = data.filter((t: TaskData) => t.isSystemTask);
      const domainBreakdown = data.reduce((acc: Record<string, number>, t: TaskData) => {
        acc[t.domainCategory] = (acc[t.domainCategory] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 [STORE] Task breakdown:', {
        total: data.length,
        systemTasks: systemTasks.length,
        domains: domainBreakdown
      });
      
      set({ 
        tasks: data,
        isLoading: false,
        selectedDate: date
      });
    } catch (error) {
      console.error('💥 [STORE] Error fetching tasks:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch tasks';
      set({ 
        error: errorMessage,
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
      // Using shared API utility
      const newTask = await apiPost<TaskData>('/api/tasks', {
        ...taskData,
        date: get().selectedDate,
        domainCategory: taskData.domainCategory || 'ethos',
        labels: taskData.labels || [],
        isSystemTask: taskData.isSystemTask || false
      });
      
      console.log('✅ [STORE] Task created:', newTask.id);
      console.log('🏷️ [STORE] Task details:', {
        domainCategory: newTask.domainCategory,
        labels: newTask.labels,
        isSystemTask: newTask.isSystemTask
      });
      
      // Add to current tasks if it's for the selected date
      const selectedDate = get().selectedDate;
      if ((typeof newTask.date === 'string' && newTask.date.startsWith(selectedDate)) || !newTask.date) {
        set((state) => ({
          tasks: [...state.tasks, newTask],
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      
      return newTask;
    } catch (error) {
      console.error('💥 [STORE] Error creating task:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to create task';
      set({ 
        error: errorMessage,
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
      // Using shared API utility
      const responseData = await apiPatch<any>(`/api/tasks/${taskId}`, updates);
      
      // Handle both TaskData and { task: TaskData } response formats
      const updatedTask = 'task' in responseData ? responseData.task : responseData;
      console.log('✅ [STORE] Task updated:', updatedTask.id);
      
      // Check for achievements using shared utility
      const achievements = extractAchievements(responseData);
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
    } catch (error) {
      console.error('💥 [STORE] Error updating task:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to update task';
      set({ 
        error: errorMessage,
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
      // Using shared API utility
      const responseData = await apiPatch<any>(`/api/tasks/${taskId}`, { 
        completed,
        completionDate 
      });
      
      // Handle both TaskData and { task: TaskData } response formats
      const updatedTask = 'task' in responseData ? responseData.task : responseData;
      console.log(`✅ [STORE] Task ${completed ? 'completed' : 'uncompleted'}:`, updatedTask.id);
      console.log('📊 [STORE] Updated metrics:', {
        currentStreak: updatedTask.currentStreak,
        totalCompletions: updatedTask.totalCompletions
      });
      
      // Check for achievements using shared utility
      const achievements = extractAchievements(responseData);
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
    } catch (error) {
      console.error(`💥 [STORE] Error ${completed ? 'completing' : 'uncompleting'} task:`, error);
      const errorMessage = error instanceof ApiError ? error.message : `Failed to ${completed ? 'complete' : 'uncomplete'} task`;
      set({ 
        error: errorMessage,
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
      // Using shared API utility
      await apiDelete(`/api/tasks/${taskId}`);
      
      console.log('✅ [STORE] Task deleted:', taskId);
      
      // Remove from local state
      set((state) => ({
        tasks: state.tasks.filter(task => task.id !== taskId),
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error('💥 [STORE] Error deleting task:', error);
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete task';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      return false;
    }
  },

  /**
   * Get tasks by domain category
   */
  getTasksByDomain: (domain: DomainCategory) => {
    const tasks = get().tasks;
    return tasks.filter(task => task.domainCategory === domain);
  },

  /**
   * Get tasks by labels
   */
  getTasksByLabels: (labels: string[]) => {
    const tasks = get().tasks;
    return tasks.filter(task => 
      labels.some(label => task.labels.includes(label))
    );
  },

  /**
   * Get system tasks only
   */
  getSystemTasks: () => {
    const tasks = get().tasks;
    return tasks.filter(task => task.isSystemTask);
  },

  /**
   * Get user tasks only (non-system)
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
   * Clear achievement notifications
   */
  clearAchievements: () => {
    set({ recentAchievements: null });
  },

  /**
   * Get tasks for a specific time block - using shared utility
   */
  getTasksForTimeBlock: (timeBlock: 'morning' | 'afternoon' | 'evening') => {
    const tasks = get().tasks;
    return tasks.filter(task => {
      const taskTimeBlock = getTimeBlockForTime(task.scheduledTime);
      return taskTimeBlock === timeBlock;
    });
  }
}));