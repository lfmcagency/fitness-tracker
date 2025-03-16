// src/components/DailyRoutineManager.tsx
"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import TaskList from './routine/TaskList'
import CreateTaskModal from './routine/CreateTaskModal' 
import TaskFilters from './routine/TaskFilters'
import DateSelector from './routine/DateSelector'
import ProgressIndicator from './routine/ProgressIndicator'
import { useTaskStore } from '@/store/tasks'

export default function DailyRoutineManager() {
  const [date, setDate] = useState<Date>(new Date())
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  
  const { 
    tasks, 
    fetchTasks, 
    isLoading, 
    error, 
    completedTasks, 
    totalTasks
  } = useTaskStore()

  // Calculate completion percentage
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          console.error('Authentication issue:', await response.text());
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch tasks when date changes
  useEffect(() => {
    const dateString = format(date, 'yyyy-MM-dd')
    fetchTasks({ date: dateString })
  }, [date, fetchTasks])

  const handlePreviousDay = () => {
    const prevDay = new Date(date)
    prevDay.setDate(prevDay.getDate() - 1)
    setDate(prevDay)
  }

  const handleNextDay = () => {
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    setDate(nextDay)
  }

  const toggleFilter = (filterId: string) => {
    setActiveFilters(activeFilters.includes(filterId)
      ? activeFilters.filter(id => id !== filterId)
      : [...activeFilters, filterId]
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-kalos-background text-kalos-text max-w-md mx-auto">
      {/* Header */}
      <header className="px-6 pt-12 pb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-light tracking-wide">Kalos</h1>
          <button
            className="w-10 h-10 rounded-full bg-kalos-text text-white flex items-center justify-center"
            onClick={() => setCreateTaskOpen(true)}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button className="p-2" onClick={handlePreviousDay}>
            <ChevronLeft className="w-5 h-5 text-kalos-secondary" />
          </button>
          <DateSelector date={date} onDateChange={setDate} />
          <button className="p-2" onClick={handleNextDay}>
            <ChevronRight className="w-5 h-5 text-kalos-secondary" />
          </button>
        </div>

        <ProgressIndicator percentage={completionPercentage} />
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-20">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-medium">Tasks</h2>
          <TaskFilters 
            activeFilters={activeFilters} 
            toggleFilter={toggleFilter} 
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-kalos-secondary">Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-kalos-high">Error: {error}</p>
          </div>
        ) : (
          <TaskList 
            tasks={tasks} 
            activeFilters={activeFilters} 
            date={date}
          />
        )}
      </main>

      {/* Create Task Dialog */}
      <CreateTaskModal 
        open={createTaskOpen} 
        onOpenChange={setCreateTaskOpen}
        date={date}
      />
    </div>
  )
}