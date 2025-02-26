'use client'

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Info, ChevronRight, Timer, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useTaskStore } from '@/store/tasks';

const DailyRoutineManager: React.FC = () => {
  const { tasks, toggleTask, fetchTasks } = useTaskStore();
  
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const completionRate = (completedTasks / totalTasks) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Daily Routine Manager</h1>
        <p className="text-gray-600">Monday, February 17</p>
      </div>

      {/* Progress Overview */}
      <Alert className="bg-blue-50 border-blue-200">
        <Zap className="h-4 w-4" />
        <AlertTitle>Today's Progress</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between items-center">
              <span>Completion Rate</span>
              <span className="font-medium">{completionRate.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map(task => (
          <div 
            key={task.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer"
            onClick={() => toggleTask(task.id)}
          >
            <div className="flex items-center space-x-4">
              {task.completed ? 
                <CheckCircle2 className="h-6 w-6 text-green-500" /> :
                <Circle className="h-6 w-6 text-gray-400" />
              }
              <div>
                <h3 className="font-medium">{task.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Timer className="h-4 w-4" />
                  <span>{task.time}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{task.streak} days</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <Alert className="bg-gray-50">
        <Info className="h-4 w-4" />
        <AlertTitle>Tip</AlertTitle>
        <AlertDescription>
          Complete all tasks to maintain your streak. Your longest streak is 15 days!
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DailyRoutineManager;