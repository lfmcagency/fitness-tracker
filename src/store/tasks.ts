import { create } from 'zustand';
import type { Task } from '@/types';

interface TaskState {
  tasks: Task[];
  completedTasks: number;
  toggleTask: (taskId: number) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  removeTask: (taskId: number) => void;
  updateTask: (taskId: number, updates: Partial<Task>) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [
    { id: 1, name: "Morning Weigh-in", time: "06:00", completed: false, streak: 7 },
    { id: 2, name: "Vitamin D + K2", time: "07:00", completed: false, streak: 12 },
    { id: 3, name: "Cold Shower", time: "07:15", completed: false, streak: 5 },
    { id: 4, name: "Mobility Work", time: "08:00", completed: false, streak: 3 },
    { id: 5, name: "Magnesium + Zinc", time: "22:00", completed: false, streak: 15 }
  ],

  completedTasks: 0,

  toggleTask: (taskId) => 
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
    }),

  addTask: (task) =>
    set((state) => {
      const newId = Math.max(...state.tasks.map(t => t.id), 0) + 1;
      return {
        tasks: [...state.tasks, { ...task, id: newId }]
      };
    }),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter(task => task.id !== taskId),
      completedTasks: state.tasks.filter(task => task.completed && task.id !== taskId).length
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? { ...task, ...updates }
          : task
      )
    }))
}));