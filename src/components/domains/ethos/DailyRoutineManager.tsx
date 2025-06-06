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
    addBlankTask, // NEW
    completeTask,
    updateTask,
    deleteTask 
  } = useTaskStore()

  // Fetch tasks due on selected date
  useEffect(() => {
    const fetchDueTasks = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/tasks/due?date=${dateStr}`)
      if (response.ok) {
        const data = await response.json()
        // Update the store's tasks with the due tasks
        useTaskStore.setState({ tasks: data.data || [] })
      }
    }
    
    fetchDueTasks()
  }, [selectedDate])

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

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    if (completed) {
      const result = await completeTask(taskId, format(selectedDate, 'yyyy-MM-dd'))
      if (result && 'xpAward' in result && result.xpAward && typeof result.xpAward === 'object' && 'xpAwarded' in result.xpAward) {
        // Show XP notification (will be implemented with toast later)
        console.log(`XP Awarded: ${result.xpAward.xpAwarded}`)
      }
    } else {
      await updateTask(taskId, { completed: false })
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
          return task.completed
        case 'incomplete':
          return !task.completed
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
      />
    </div>
  )
}