'use client';

import React, { useEffect } from 'react';
import { useTaskStore } from '@/store/tasks';
import { Card } from '@/components/ui/card';
import { DateSelector } from './DateSelector';
import { ProgressIndicator } from './ProgressIndicator';
import { TimeBlock } from './TimeBlock';

export function DailyRoutineManager() {
  const { 
    tasks, 
    selectedDate, 
    isLoading, 
    error,
    setSelectedDate,
    fetchTasksForDate,
    getTasksForTimeBlock,
    clearError
  } = useTaskStore();

  // Just trigger initial fetch once
useEffect(() => {
  if (tasks.length === 0 && !isLoading) {
    fetchTasksForDate(selectedDate);
  }
}, []);

  // Handle date changes
  const handleDateChange = (newDate: string) => {
    console.log('📅 [DRM] Date changed to:', newDate);
    setSelectedDate(newDate);
  };

  // Calculate progress for the indicator
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  console.log('📊 [DRM] Progress stats:', { totalTasks, completedTasks, progressPercentage });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Routine</h1>
          <p className="text-gray-600 mt-1">
            Manage your tasks and build consistency
          </p>
        </div>
        
        <DateSelector 
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
      </div>

      {/* Progress Overview */}
      <ProgressIndicator
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        progressPercentage={progressPercentage}
        isLoading={isLoading}
      />

      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <button 
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading tasks...</span>
          </div>
        </Card>
      )}

      {/* Time Blocks */}
      {!isLoading && (
        <div className="space-y-6">
          <TimeBlock
            title="Morning"
            timeBlock="morning" 
            icon="🌅"
            tasks={getTasksForTimeBlock('morning')}
            selectedDate={selectedDate}
          />
          
          <TimeBlock
            title="Afternoon"
            timeBlock="afternoon"
            icon="☀️" 
            tasks={getTasksForTimeBlock('afternoon')}
            selectedDate={selectedDate}
          />
          
          <TimeBlock
            title="Evening"
            timeBlock="evening"
            icon="🌙"
            tasks={getTasksForTimeBlock('evening')}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && totalTasks === 0 && (
        <Card className="p-8 text-center">
          <div className="space-y-3">
            <div className="text-4xl">📝</div>
            <h3 className="text-lg font-medium text-gray-900">No tasks for this day</h3>
            <p className="text-gray-600">
              Add your first task to get started with your daily routine
            </p>
          </div>
        </Card>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify({
              selectedDate,
              totalTasks,
              completedTasks,
              tasksPerTimeBlock: {
                morning: getTasksForTimeBlock('morning').length,
                afternoon: getTasksForTimeBlock('afternoon').length,
                evening: getTasksForTimeBlock('evening').length
              }
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}