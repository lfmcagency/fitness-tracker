'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface ProgressIndicatorProps {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  isLoading?: boolean;
}

export function ProgressIndicator({ 
  totalTasks, 
  completedTasks, 
  progressPercentage, 
  isLoading = false 
}: ProgressIndicatorProps) {
  
  // Calculate remaining tasks
  const remainingTasks = totalTasks - completedTasks;
  
  // Determine progress status and styling
  const getProgressStatus = () => {
    if (totalTasks === 0) return { text: 'No tasks', color: 'gray', emoji: '📝' };
    if (progressPercentage === 100) return { text: 'Complete!', color: 'green', emoji: '🎉' };
    if (progressPercentage >= 75) return { text: 'Almost done', color: 'blue', emoji: '💪' };
    if (progressPercentage >= 50) return { text: 'Good progress', color: 'blue', emoji: '⚡' };
    if (progressPercentage >= 25) return { text: 'Getting started', color: 'yellow', emoji: '🚀' };
    return { text: 'Just started', color: 'gray', emoji: '🎯' };
  };

  const status = getProgressStatus();

  // Progress bar color based on completion
  const getProgressBarColor = () => {
    if (progressPercentage === 100) return 'bg-green-500';
    if (progressPercentage >= 75) return 'bg-blue-500';
    if (progressPercentage >= 50) return 'bg-blue-400';
    if (progressPercentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{status.emoji}</span>
            <span className="font-medium text-gray-900">{status.text}</span>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {completedTasks}/{totalTasks}
            </div>
            <div className="text-xs text-gray-500">tasks completed</div>
          </div>
        </div>

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ease-out ${getProgressBarColor()}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Progress Stats */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>{progressPercentage}% complete</span>
              {remainingTasks > 0 && (
                <span>{remainingTasks} remaining</span>
              )}
            </div>
          </div>
        )}

        {/* Empty State Message */}
        {totalTasks === 0 && (
          <div className="text-center text-gray-500 text-sm py-2">
            Add some tasks to start tracking your progress
          </div>
        )}

        {/* Completion Celebration */}
        {progressPercentage === 100 && totalTasks > 0 && (
          <div className="text-center py-2">
            <div className="text-green-600 font-medium text-sm">
              🎊 All tasks completed! Great job! 🎊
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}