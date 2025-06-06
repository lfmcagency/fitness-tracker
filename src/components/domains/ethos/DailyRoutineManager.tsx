'use client'

import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/tasks'
import DateSelector from './DateSelector'
import ProgressIndicator from './ProgressIndicator'
import TaskList from './TaskList'
import TaskFilters from './TaskFilters'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function DailyRoutineManager() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  
  const { 
    tasks, 
    isLoading, 
    error,
    addBlankTask,
    completeTaskOnDate, // Updated method name for date-specific completion
    updateTask,
    deleteTask,
    fetchTasksForDate // New method to fetch tasks for specific date
  } = useTaskStore()
console.log('Store tasks:', tasks);

  // Fetch tasks due on selected date
  useEffect(() => {
  const fetchDueTasks = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    console.log('Selected date changed to:', dateStr)
    
    // Always use the store method
    if (fetchTasksForDate) {
      await fetchTasksForDate(dateStr)
      console.log('Store tasks after fetch:', useTaskStore.getState().tasks)
    }
  }
  
  fetchDueTasks()
}, [selectedDate, fetchTasksForDate])

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handleAddTask = () => {
    // Determine time block based on current time or default to morning
    const currentHour = new Date().getHours()
    let timeBlock = 'morning'
    
    if (currentHour >= 12 && currentHour < 18) {
      timeBlock = 'afternoon'
    } else if (currentHour >= 18) {
      timeBlock = 'evening'
    }
    
    // Add blank task and put it in edit mode
    addBlankTask(timeBlock)
  }

  const handleTaskComplete = async (taskId: string, completed: boolean, date?: string) => {
    // Use passed date if provided, otherwise use selectedDate
    const dateStr = date || format(selectedDate, 'yyyy-MM-dd')
    
    if (completed) {
      // Use date-specific completion method
      const result = await completeTaskOnDate(taskId, dateStr)
      if (result && 'xpAward' in result && result.xpAward && typeof result.xpAward === 'object' && 'xpAwarded' in result.xpAward) {
        // Show XP notification (will be implemented with toast later)
        console.log(`XP Awarded: ${result.xpAward.xpAwarded}`)
      }
    } else {
      // Use date-specific uncompletion - update the task to uncomplete for this specific date
      await updateTask(taskId, { 
        completed: false, 
        completionDate: dateStr 
      })
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    await updateTask(taskId, updates)
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
  }

  // Filter tasks based on active filters
  const filteredTasks = tasks.filter(task => {
    if (activeFilters.length === 0) return true
    
    return activeFilters.some(filter => {
      switch (filter) {
        case 'completed':
          return task.completed // This will now be date-specific
        case 'incomplete':
          return !task.completed // This will now be date-specific
        case 'high':
          return task.priority === 'high'
        case 'medium':
          return task.priority === 'medium'
        case 'low':
          return task.priority === 'low'
        case 'nous':
        case 'soma':
        case 'trophe':
          return task.category?.toLowerCase() === filter
        default:
          return true
      }
    })
  })

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with date selector */}
      <div className="flex justify-between items-center">
        <DateSelector 
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
        
        <button
          onClick={handleAddTask}
          className="w-10 h-10 rounded-full bg-kalos-dark text-white flex items-center justify-center hover:bg-opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Progress indicator */}
      <ProgressIndicator tasks={filteredTasks} />

      {/* Filters */}
      <TaskFilters 
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Task list */}
      <TaskList 
        tasks={filteredTasks}
        isLoading={isLoading}
        onTaskComplete={handleTaskComplete}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        selectedDate={selectedDate} // Pass selected date to TaskList
      />
    </div>
  )
}