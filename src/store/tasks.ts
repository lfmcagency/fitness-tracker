import { create } from 'zustand';
import type { Task } from '@/types';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  completedTasks: number;
  fetchTasks: () => Promise<void>;
  toggleTask: (taskId: number) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  removeTask: (taskId: number) => void;
  updateTask: (taskId: number, updates: Partial<Task>) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  completedTasks: 0,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/tasks');
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      
      if (data.success) {
        set({ 
          tasks: data.data,
          completedTasks: data.data.filter((task: Task) => task.completed).length,
          isLoading: false
        });
      } else {
        throw new Error(data.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks', 
        isLoading: false 
      });
    }
  },

  toggleTask: (taskId) => {
    // Optimistic update
    set((state) => {
      const updatedTasks = state.tasks.map(task =>
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      );
      return {
        tasks: updatedTasks,
        completedTasks: updatedTasks.filter(task => task.completed).length
      };
    });
    
    // Then send to API
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed })
    }).catch(error => {
      console.error('Error toggling task:', error);
      // Revert on error
      set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === taskId ? { ...t, completed: task.completed } : t
        ),
        error: 'Failed to update task'
      }));
    });
  },

  addTask: (task) => {
    // Generate temporary ID
    const tempId = Date.now();
    const newTask = { ...task, id: tempId };
    
    // Optimistic update
    set((state) => ({
      tasks: [...state.tasks, newTask]
    }));
    
    // Send to API
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Replace temp task with real one from server
          set((state) => ({
            tasks: state.tasks.map(t => 
              t.id === tempId ? data.data : t
            )
          }));
        } else {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error adding task:', error);
        // Remove the task on error
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== tempId),
          error: 'Failed to add task'
        }));
      });
  },

  removeTask: (taskId) => {
    // Store the task before removing
    const taskToRemove = get().tasks.find(t => t.id === taskId);
    
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter(task => task.id !== taskId),
      completedTasks: state.tasks.filter(task => task.completed && task.id !== taskId).length
    }));
    
    // Send to API
    fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error removing task:', error);
        // Restore the task on error
        if (taskToRemove) {
          set((state) => ({
            tasks: [...state.tasks, taskToRemove],
            error: 'Failed to remove task'
          }));
        }
      });
  },

  updateTask: (taskId, updates) => {
    // Store original task
    const originalTask = get().tasks.find(t => t.id === taskId);
    
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? { ...task, ...updates }
          : task
      )
    }));
    
    // Send to API
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.message);
        }
      })
      .catch(error => {
        console.error('Error updating task:', error);
        // Revert on error
        if (originalTask) {
          set((state) => ({
            tasks: state.tasks.map(t =>
              t.id === taskId ? originalTask : t
            ),
            error: 'Failed to update task'
          }));
        }
      });
  }
}));