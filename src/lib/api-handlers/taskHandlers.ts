// src/lib/api-handlers/taskHandlers.ts
import { TaskData, RecurrencePattern, TaskPriority } from '@/types'
import { format } from 'date-fns'

// Fetch tasks for a specific date
export async function getTasksForDate(dateStr: string): Promise<TaskData[]> {
  const response = await fetch(`/api/tasks/due?date=${dateStr}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch tasks')
  }
  
  const data = await response.json()
  return data.data || []
}

// Create a new task
export async function createTask(taskData: Omit<TaskData, 'id' | 'currentStreak' | 'bestStreak'>): Promise<TaskData> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: taskData.name,
      description: taskData.description || '',
      scheduledTime: taskData.scheduledTime,
      date: format(new Date(taskData.date || new Date()), 'yyyy-MM-dd'),
      recurrencePattern: taskData.recurrencePattern,
      category: taskData.category,
      priority: taskData.priority,
      // timeBlock is derived from scheduledTime on the server
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create task')
  }
  
  const data = await response.json()
  return data.data
}

// Update an existing task
export async function updateTask(taskId: string, updates: Partial<TaskData>): Promise<TaskData> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update task')
  }
  
  const data = await response.json()
  return data.data
}

// Delete a task
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to delete task')
  }
}

// Mark a task as complete or incomplete
export async function completeTask(taskId: string, completed: boolean): Promise<TaskData> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ completed }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update task completion')
  }
  
  const data = await response.json()
  return data.data
}

// Get streak information for a task
export async function getTaskStreak(taskId: string): Promise<{
  currentStreak: number
  bestStreak: number
  lastCompletedDate: string | null
}> {
  const response = await fetch(`/api/tasks/${taskId}/streak`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch task streak')
  }
  
  const data = await response.json()
  return data.data
}