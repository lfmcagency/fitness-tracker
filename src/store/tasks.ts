import { create } from 'zustand';
import { EnhancedTask as Task } from '@/types';
import type { EnhancedTask, RecurrencePattern, TaskPriority, TaskWithHistory } from '@/types';
import { TaskStatistics } from '@/lib/task-statistics';
import { TaskListResponse, TaskResponse, TaskStatisticsResponse } from '@/types/api/taskResponses';
import { ApiSuccessResponse, ApiErrorResponse } from '@/types/api/common';

// Task filter parameters interface
export interface TaskFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  today?: boolean;
  category?: string;
  completed?: boolean;
  includeHistory?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Task creation parameters interface
export interface CreateTaskParams {
  name: string;
  scheduledTime: string;
  recurrencePattern?: RecurrencePattern;
  customRecurrenceDays?: number[];
  category?: string;
  priority?: TaskPriority;
  date?: string;
  description?: string;
  timeBlock?: string;
}

interface TaskState {
  tasks: EnhancedTask[];
  filteredTasks: EnhancedTask[];
  isLoading: boolean;
  error: string | null;
  completedTasks: number;
  currentPage: number;
  totalPages: number;
  totalTasks: number;
  currentFilter: TaskFilter;
  statistics: TaskStatistics | null;
  isLoadingStats: boolean;
  
  // API methods
  fetchTasks: (filter?: TaskFilter) => Promise<void>;
  fetchTaskById: (taskId: string | number) => Promise<EnhancedTask | null>;
  addTask: (task: CreateTaskParams) => Promise<EnhancedTask | null>;
  addBlankTask: (timeBlock?: string) => string;
  saveBlankTask: (tempId: string, taskData: CreateTaskParams) => Promise<EnhancedTask | null>;
  cancelBlankTask: (tempId: string) => void;
  updateTask: (taskId: string | number, updates: Partial<EnhancedTask>) => Promise<EnhancedTask | null>;
  completeTask: (taskId: string | number, date?: string) => Promise<EnhancedTask | null>;
  completeTaskOnDate: (taskId: string | number, date: string) => Promise<any>;
  fetchTasksForDate: (date: string) => Promise<void>;
  deleteTask: (taskId: string | number, skipConfirmation?: boolean) => Promise<boolean>;
  fetchStatistics: (filter?: TaskFilter) => Promise<TaskStatistics | null>;
  
  // Cache and state helpers
  updateLocalTask: (taskId: string | number, updates: Partial<EnhancedTask>) => void;
  removeLocalTask: (taskId: string | number) => void;
  updateTaskFilters: (filter: TaskFilter) => void;
  clearTaskFilters: () => void;
}

// Helper functions
const getTaskId = (taskId: string | number): string => {
  return typeof taskId === 'number' ? taskId.toString() : taskId;
};

const buildQueryString = (filter?: TaskFilter): string => {
  if (!filter) return '';
  
  const params = new URLSearchParams();
  
  // Add all filter parameters if they exist
  if (filter.date) params.append('date', filter.date);
  if (filter.startDate) params.append('startDate', filter.startDate);
  if (filter.endDate) params.append('endDate', filter.endDate);
  if (filter.today) params.append('today', 'true');
  if (filter.category) params.append('category', filter.category);
  if (filter.completed !== undefined) params.append('completed', filter.completed.toString());
  if (filter.includeHistory) params.append('includeHistory', 'true');
  if (filter.sort) params.append('sort', filter.sort);
  if (filter.order) params.append('order', filter.order);
  if (filter.page) params.append('page', filter.page.toString());
  if (filter.limit) params.append('limit', filter.limit.toString());
  
  return `?${params.toString()}`;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  filteredTasks: [],
  isLoading: false,
  error: null,
  completedTasks: 0,
  currentPage: 1,
  totalPages: 1,
  totalTasks: 0,
  currentFilter: {},
  statistics: null,
  isLoadingStats: false,

  /**
   * Fetch tasks with optional filtering
   */
  fetchTasks: async (filter?: TaskFilter) => {
    set({ isLoading: true, error: null });
    try {
      // Update current filter
      if (filter) {
        set({ currentFilter: { ...get().currentFilter, ...filter } });
      }
      
      // Build query string from current filters
      const queryString = buildQueryString(get().currentFilter);
      
      console.log("Fetching tasks with URL:", `/api/tasks${queryString}`);

      // Fetch tasks from API
      const response = await fetch(`/api/tasks${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskListResponse;
      
      if (data.success) {
        // Extract tasks and pagination information
        const tasks = data.data.data;
        const pagination = data.data.pagination;
        
        set({ 
          tasks: tasks,
          filteredTasks: tasks,
          completedTasks: tasks.filter((task: EnhancedTask) => task.completed).length,
          currentPage: pagination.page,
          totalPages: pagination.pages,
          totalTasks: pagination.total,
          isLoading: false
        });
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      const queryString = buildQueryString(get().currentFilter);
      console.log("Fetching tasks with URL:", `/api/tasks${queryString}`);
      console.error('Error fetching tasks:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks', 
        isLoading: false 
      });
    }
  },

  /**
   * Fetch tasks for specific date
   */
  fetchTasksForDate: async (date: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/tasks/due?date=${date}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const tasks = data.data || [];
        set({ 
          tasks: tasks,
          filteredTasks: tasks,
          completedTasks: tasks.filter((task: EnhancedTask) => task.completed).length,
          isLoading: false
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks for date:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks', 
        isLoading: false 
      });
    }
  },

  /**
   * Fetch a single task by ID
   */
  fetchTaskById: async (taskId: string | number) => {
    const id = getTaskId(taskId);
    
    try {
      // Check if we already have this task in local state
      const cachedTask = get().tasks.find(t => getTaskId(t.id!) === id);
      if (cachedTask) return cachedTask;
      
      // Otherwise fetch from API
      const response = await fetch(`/api/tasks/${id}?includeHistory=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskResponse;
      
      if (data.success) {
        // Add to local state
        set((state) => ({
          tasks: [...state.tasks.filter(t => getTaskId(t.id!) !== id), data.data]
        }));
        
        return data.data;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || `Failed to fetch task ${id}`);
      }
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      set({ 
        error: error instanceof Error ? error.message : `Failed to fetch task ${id}` 
      });
      return null;
    }
  },

  /**
   * Add a blank task for inline editing
   */
  addBlankTask: (timeBlock = 'morning') => {
    const tempId = `blank-${Date.now()}`;
    const blankTask: EnhancedTask = {
      id: tempId,
      name: '',
      description: '',
      scheduledTime: '09:00', // Default based on time block
      completed: false,
      recurrencePattern: 'once',
      customRecurrenceDays: [],
      currentStreak: 0,
      bestStreak: 0,
      category: 'general',
      priority: 'medium',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      timeBlock,
      isNew: true // Flag to indicate this is a new task being created
    };
    
    // Add to top of the list for the selected time block
    set((state) => ({
      tasks: [blankTask, ...state.tasks],
      filteredTasks: [blankTask, ...state.filteredTasks],
      error: null
    }));
    
    return tempId;
  },

  /**
   * Save a blank task (convert to real task)
   */
  saveBlankTask: async (tempId: string, taskData: CreateTaskParams) => {
    // Remove the blank task first
    set((state) => ({
      tasks: state.tasks.filter(t => getTaskId(t.id!) !== tempId),
      filteredTasks: state.filteredTasks.filter(t => getTaskId(t.id!) !== tempId)
    }));
    
    // Create the real task using existing addTask method
    return await get().addTask(taskData);
  },

  /**
   * Cancel blank task creation
   */
  cancelBlankTask: (tempId: string) => {
    set((state) => ({
      tasks: state.tasks.filter(t => getTaskId(t.id!) !== tempId),
      filteredTasks: state.filteredTasks.filter(t => getTaskId(t.id!) !== tempId)
    }));
  },

  /**
   * Add a new task
   */
  addTask: async (taskData: CreateTaskParams) => {
    // Generate temporary ID for optimistic updates
    const tempId = `temp-${Date.now()}`;
    const tempTask: EnhancedTask = {
      id: tempId,
      name: taskData.name,
      scheduledTime: taskData.scheduledTime,
      completed: false,
      recurrencePattern: taskData.recurrencePattern || 'daily',
      customRecurrenceDays: taskData.customRecurrenceDays || [],
      currentStreak: 0,
      bestStreak: 0,
      category: taskData.category || 'general',
      priority: taskData.priority || 'medium',
      date: taskData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: taskData.description
    };
    
    // Optimistic update
    set((state) => ({
      tasks: [...state.tasks, tempTask],
      filteredTasks: [...state.filteredTasks, tempTask],
      error: null
    }));
    
    // Send to API
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskResponse;
      
      if (data.success) {
        // Replace temp task with real one from server
        set((state) => ({
          tasks: state.tasks.map(t => getTaskId(t.id!) === tempId ? data.data : t),
          filteredTasks: state.filteredTasks.map(t => getTaskId(t.id!) === tempId ? data.data : t)
        }));
        
        return data.data;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to add task');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      
      // Remove the temporary task on error
      set((state) => ({
        tasks: state.tasks.filter(t => getTaskId(t.id!) !== tempId),
        filteredTasks: state.filteredTasks.filter(t => getTaskId(t.id!) !== tempId),
        error: error instanceof Error ? error.message : 'Failed to add task'
      }));
      
      return null;
    }
  },

  /**
   * Update a task
   */
  updateTask: async (taskId: string | number, updates: Partial<EnhancedTask>) => {
    const id = getTaskId(taskId);
    
    // Store original task for rollback
    const originalTask = get().tasks.find(t => getTaskId(t.id!) === id);
    if (!originalTask) {
      set({ error: `Task with ID ${id} not found` });
      return null;
    }
    
    // Optimistic update
    get().updateLocalTask(id, updates);
    
    // Send to API
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskResponse;
      
      if (data.success) {
        // Update with server data to ensure consistency
        const taskData = 'task' in data.data ? data.data.task : data.data;
        get().updateLocalTask(id, taskData);
        return taskData;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to update task');
      }
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      
      // Revert on error
      if (originalTask) {
        get().updateLocalTask(id, originalTask);
      }
      
      set({ error: error instanceof Error ? error.message : `Failed to update task ${id}` });
      return null;
    }
  },

  /**
   * Mark a task as completed
   */
  completeTask: async (taskId: string | number, date?: string) => {
    const id = getTaskId(taskId);
    
    // Find task in state
    const task = get().tasks.find(t => getTaskId(t.id!) === id);
    if (!task) {
      set({ error: `Task with ID ${id} not found` });
      return null;
    }
    
    // Optimistic update
    get().updateLocalTask(id, { 
      completed: true,
      currentStreak: task.currentStreak + 1,
      lastCompletedDate: date || new Date().toISOString()
    });
    
    // Send to API with optional completion date
    try {
      const body: any = { completed: true };
      if (date) {
        body.completionDate = date;
      }
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to complete task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskResponse;
      
      if (data.success) {
        // Update with server data to ensure streak is calculated correctly
        const taskData = 'task' in data.data ? data.data.task : data.data;
        get().updateLocalTask(id, taskData);
        return taskData;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to complete task');
      }
    } catch (error) {
      console.error(`Error completing task ${id}:`, error);
      
      // Revert on error
      get().updateLocalTask(id, { 
        completed: task.completed,
        currentStreak: task.currentStreak,
        lastCompletedDate: task.lastCompletedDate
      });
      
      set({ error: error instanceof Error ? error.message : `Failed to complete task ${id}` });
      return null;
    }
  },

  /**
   * Complete task on specific date
   */
  completeTaskOnDate: async (taskId: string | number, date: string) => {
    return await get().completeTask(taskId, date);
  },

  /**
   * Delete a task
   */
  deleteTask: async (taskId: string | number, skipConfirmation = false) => {
    const id = getTaskId(taskId);
    
    // Find task in state
    const taskToRemove = get().tasks.find(t => getTaskId(t.id!) === id);
    if (!taskToRemove) {
      set({ error: `Task with ID ${id} not found` });
      return false;
    }
    
    // Confirmation (if not skipped)
    if (!skipConfirmation) {
      const confirmed = window.confirm(`Are you sure you want to delete task: ${taskToRemove.name}?`);
      if (!confirmed) return false;
    }
    
    // Optimistic update
    get().removeLocalTask(id);
    
    // Send to API
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return true;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      
      // Restore the task on error
      set((state) => ({
        tasks: [...state.tasks, taskToRemove],
        filteredTasks: [...state.filteredTasks, taskToRemove],
        error: error instanceof Error ? error.message : `Failed to delete task ${id}`
      }));
      
      return false;
    }
  },

  /**
   * Fetch task statistics
   */
  fetchStatistics: async (filter?: TaskFilter) => {
    set({ isLoadingStats: true, error: null });
    
    try {
      // Build query string from filters
      const queryString = buildQueryString(filter);
      
      // Fetch statistics from API
      const response = await fetch(`/api/tasks/statistics${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as TaskStatisticsResponse;
      
      if (data.success) {
        set({ 
          statistics: data.data,
          isLoadingStats: false
        });
        
        return data.data;
      } else {
        // Handle API error
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch statistics', 
        isLoadingStats: false 
      });
      
      return null;
    }
  },

  /**
   * Update local task in state
   */
  updateLocalTask: (taskId: string | number, updates: Partial<EnhancedTask>) => {
    const id = getTaskId(taskId);
    
    set((state) => {
      // Update in main tasks array
      const updatedTasks = state.tasks.map(task =>
        getTaskId(task.id!) === id 
          ? { ...task, ...updates }
          : task
      );
      
      // Update in filtered tasks array
      const updatedFilteredTasks = state.filteredTasks.map(task =>
        getTaskId(task.id!) === id 
          ? { ...task, ...updates }
          : task
      );
      
      // Recalculate completed tasks count
      const completedCount = updatedTasks.filter(task => task.completed).length;
      
      return {
        tasks: updatedTasks,
        filteredTasks: updatedFilteredTasks,
        completedTasks: completedCount
      };
    });
  },

  /**
   * Remove a task from local state
   */
  removeLocalTask: (taskId: string | number) => {
    const id = getTaskId(taskId);
    
    set((state) => {
      // Remove from main tasks array
      const updatedTasks = state.tasks.filter(task => getTaskId(task.id!) !== id);
      
      // Remove from filtered tasks array
      const updatedFilteredTasks = state.filteredTasks.filter(task => getTaskId(task.id!) !== id);
      
      // Recalculate completed tasks count
      const completedCount = updatedTasks.filter(task => task.completed).length;
      
      return {
        tasks: updatedTasks,
        filteredTasks: updatedFilteredTasks,
        completedTasks: completedCount
      };
    });
  },

  /**
   * Update task filters
   */
  updateTaskFilters: (filter: TaskFilter) => {
    set((state) => ({
      currentFilter: { ...state.currentFilter, ...filter }
    }));
    
    // Reload tasks with new filters
    get().fetchTasks();
  },

  /**
   * Clear all task filters
   */
  clearTaskFilters: () => {
    set({ currentFilter: {} });
    
    // Reload tasks without filters
    get().fetchTasks();
  }
}));

export type { Task };