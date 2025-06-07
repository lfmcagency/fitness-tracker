'use client';

import React from 'react';
import { TaskData } from '@/types';
import { Button } from '@/components/ui/button';

interface TaskCardProps {
  task: TaskData;
  onEdit: () => void;
  onComplete: (completed: boolean) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onComplete, 
  onDelete, 
  disabled = false 
}: TaskCardProps) {
  
  // Format the scheduled time for display
  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return time; // Fallback to original if parsing fails
    }
  };

  // Get priority styling
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Get completion checkbox styling
  const getCheckboxStyle = () => {
    if (task.completed) {
      return 'bg-green-500 border-green-500 text-white';
    }
    return 'border-gray-300 hover:border-green-400';
  };

  return (
    <div 
      className={`
        border-l-4 rounded-r-lg p-4 transition-all duration-200
        ${getPriorityStyle(task.priority)}
        ${disabled ? 'opacity-50' : 'hover:shadow-sm'}
        ${task.completed ? 'opacity-75' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Completion Checkbox */}
        <button
          onClick={() => onComplete(!task.completed)}
          disabled={disabled}
          className={`
            mt-1 w-5 h-5 rounded border-2 flex items-center justify-center
            transition-all duration-200 shrink-0
            ${getCheckboxStyle()}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
          `}
          title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {task.completed && (
            <svg 
              className="w-3 h-3" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Task Name and Time */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`
              font-medium truncate
              ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}
            `}>
              {task.name}
            </h3>
            
            <span className="text-sm text-gray-500 shrink-0">
              {formatTime(task.scheduledTime)}
            </span>
          </div>

          {/* Task Description */}
          {task.description && (
            <p className={`
              text-sm text-gray-600 mb-2 line-clamp-2
              ${task.completed ? 'line-through' : ''}
            `}>
              {task.description}
            </p>
          )}

          {/* Task Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {/* Category */}
            <span className="px-2 py-1 bg-gray-100 rounded-full">
              {task.category}
            </span>
            
            {/* Priority Indicator */}
            <span className={`
              px-2 py-1 rounded-full
              ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'}
            `}>
              {task.priority}
            </span>

            {/* Streak Display */}
            {task.currentStreak > 0 && (
              <span className="flex items-center gap-1">
                🔥 {task.currentStreak} streak
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!disabled && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="px-2 h-8 text-xs"
              title="Edit task"
            >
              ✏️
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="px-2 h-8 text-xs hover:bg-red-50 hover:border-red-200"
              title="Delete task"
            >
              🗑️
            </Button>
          </div>
        )}
      </div>

      {/* Completion Indicator */}
      {task.completed && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <span>✅</span>
            <span>Completed</span>
            {task.currentStreak > 1 && (
              <span className="ml-auto">
                🎯 {task.currentStreak} day streak!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}