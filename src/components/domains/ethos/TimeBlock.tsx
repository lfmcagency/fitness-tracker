'use client';

import React, { useState } from 'react';
import { useTaskStore } from '@/store/tasks';
import { TaskData, CreateTaskParams } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Components we'll build next
import { TaskCard } from './TaskCard';
import { InlineEditor } from './InlineEditor';
import { TaskCreator } from './TaskCreator';

interface TimeBlockProps {
  title: string;
  timeBlock: 'morning' | 'afternoon' | 'evening';
  icon: string;
  tasks: TaskData[];
  selectedDate: string;
}

export function TimeBlock({ 
  title, 
  timeBlock, 
  icon, 
  tasks, 
  selectedDate 
}: TimeBlockProps) {
  
  const { createTask, updateTask, completeTask, deleteTask, isLoading } = useTaskStore();
  
  // Mode management state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  console.log(`🏗️ [TimeBlock-${timeBlock}] Rendering with ${tasks.length} tasks`);

  // Get default scheduled time based on time block
  const getDefaultScheduledTime = (): string => {
    switch (timeBlock) {
      case 'morning': return '09:00';
      case 'afternoon': return '14:00';
      case 'evening': return '20:00';
      default: return '12:00';
    }
  };

  // Auto-save and switch to new editing task
  const handleEditTask = async (taskId: string) => {
    console.log(`✏️ [TimeBlock-${timeBlock}] Edit requested for task:`, taskId);
    
    // If already editing a different task, auto-save it first
    if (editingTaskId && editingTaskId !== taskId) {
      console.log(`💾 [TimeBlock-${timeBlock}] Auto-saving previous task:`, editingTaskId);
      // The InlineEditor will handle the save via handleUpdateTask
      // For now, just close the previous one
      setEditingTaskId(null);
    }
    
    // Switch to new editing task
    setEditingTaskId(taskId);
    setIsCreating(false); // Close creation mode if open
  };

  // Cancel editing and return to display mode
  const handleCancelEdit = () => {
    console.log(`❌ [TimeBlock-${timeBlock}] Canceling edit mode`);
    setEditingTaskId(null);
  };

  // Update task via store
  const handleUpdateTask = async (taskId: string, updates: Partial<TaskData>) => {
    console.log(`💾 [TimeBlock-${timeBlock}] Updating task:`, taskId, updates);
    setIsSaving(true);
    
    try {
      const updatedTask = await updateTask(taskId, updates);
      if (updatedTask) {
        setEditingTaskId(null); // Exit edit mode on success
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Complete/uncomplete task
  const handleCompleteTask = async (taskId: string, completed: boolean) => {
    console.log(`${completed ? '✅' : '❌'} [TimeBlock-${timeBlock}] Toggling completion:`, taskId, completed);
    
    // Disable other edit buttons while saving
    setIsSaving(true);
    
    try {
      await completeTask(taskId, completed, selectedDate);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, taskName: string) => {
    console.log(`🗑️ [TimeBlock-${timeBlock}] Delete requested for task:`, taskId);
    
    // Confirm deletion
    const confirmed = window.confirm(`Delete task "${taskName}"?`);
    if (!confirmed) return;
    
    setIsSaving(true);
    
    try {
      const success = await deleteTask(taskId);
      if (success && editingTaskId === taskId) {
        setEditingTaskId(null); // Close edit mode if we were editing this task
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Start creating new task
  const handleStartCreating = () => {
    console.log(`➕ [TimeBlock-${timeBlock}] Starting task creation`);
    
    // Close any editing mode
    if (editingTaskId) {
      setEditingTaskId(null);
    }
    
    setIsCreating(true);
  };

  // Cancel task creation
  const handleCancelCreating = () => {
    console.log(`❌ [TimeBlock-${timeBlock}] Canceling task creation`);
    setIsCreating(false);
  };

  // Create new task
  const handleCreateTask = async (taskData: CreateTaskParams) => {
    console.log(`➕ [TimeBlock-${timeBlock}] Creating task:`, taskData.name);
    setIsSaving(true);
    
    try {
      const newTask = await createTask({
        ...taskData,
        scheduledTime: taskData.scheduledTime || getDefaultScheduledTime()
      });
      
      if (newTask) {
        setIsCreating(false); // Exit creation mode on success
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Sort tasks by scheduled time for consistent display
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) {
      return a.scheduledTime.localeCompare(b.scheduledTime);
    }
    return 0;
  });

  return (
    <Card className="p-4">
      {/* Time Block Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>

        {/* Add Task Button */}
        {!isCreating && (
          <Button
            onClick={handleStartCreating}
            disabled={isLoading || isSaving}
            size="sm"
            className="shrink-0"
          >
            + Add Task
          </Button>
        )}
      </div>

      {/* Task Creation Form */}
      {isCreating && (
        <div className="mb-4">
          <TaskCreator
            timeBlock={timeBlock}
            defaultScheduledTime={getDefaultScheduledTime()}
            selectedDate={selectedDate}
            onSave={handleCreateTask}
            onCancel={handleCancelCreating}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {sortedTasks.map((task) => {
          const taskId = task.id!.toString();
          const isEditingThis = editingTaskId === taskId;
          
          return (
            <div key={taskId} className="transition-all duration-200">
              {isEditingThis ? (
                // Editing mode: show InlineEditor
                <InlineEditor
                  task={task}
                  onSave={(updates) => handleUpdateTask(taskId, updates)}
                  onCancel={handleCancelEdit}
                  isSaving={isSaving}
                />
              ) : (
                // Display mode: show TaskCard
                <TaskCard
                  task={task}
                  onEdit={() => handleEditTask(taskId)}
                  onComplete={(completed) => handleCompleteTask(taskId, completed)}
                  onDelete={() => handleDeleteTask(taskId, task.name)}
                  disabled={isSaving || isLoading || editingTaskId !== null}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!isCreating && sortedTasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm">No {title.toLowerCase()} tasks yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Click "Add Task" to get started
          </p>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs text-gray-400">
          <summary className="cursor-pointer">Debug - {title}</summary>
          <pre className="mt-1 text-xs">
            {JSON.stringify({
              timeBlock,
              taskCount: tasks.length,
              editingTaskId,
              isCreating,
              isSaving,
              taskIds: tasks.map(t => t.id)
            }, null, 2)}
          </pre>
        </details>
      )}
    </Card>
  );
}