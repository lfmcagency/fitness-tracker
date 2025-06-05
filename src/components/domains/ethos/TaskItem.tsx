'use client'

import { useState } from 'react'
import { EnhancedTask } from '@/types'
import { Flame, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TaskItemProps {
  task: EnhancedTask
  onComplete: (completed: boolean) => void
  onUpdate: (updates: any) => void
  onDelete: () => void
}

export default function TaskItem({ task, onComplete, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(task.name)

  const handleComplete = () => {
    onComplete(!task.completed)
  }

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName !== task.name) {
      onUpdate({ name: editedName.trim() })
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedName(task.name)
    setIsEditing(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-kalos-muted'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'nous':
        return 'bg-blue-100 text-blue-700'
      case 'soma':
        return 'bg-green-100 text-green-700'
      case 'trophe':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="flex items-start bg-white rounded-lg border border-kalos-border p-4 hover:shadow-sm transition-shadow">
      {/* Completion checkbox */}
      <button
        onClick={handleComplete}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex-shrink-0 mr-4 mt-0.5",
          "flex items-center justify-center transition-all duration-200",
          task.completed 
            ? "bg-kalos-dark border-kalos-dark" 
            : "border-kalos-muted hover:border-kalos-dark"
        )}
      >
        {task.completed && (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </button>

      {/* Task content */}
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
                if (e.key === 'Escape') handleCancelEdit()
              }}
              className="flex-1 px-2 py-1 border border-kalos-border rounded-md focus:outline-none focus:ring-2 focus:ring-kalos-dark"
              autoFocus
            />
            <button
              onClick={handleSaveEdit}
              className="text-sm text-green-600 hover:text-green-700"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-sm text-kalos-muted hover:text-kalos-text"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h4 className={cn(
              "text-base font-normal mb-1",
              task.completed && "line-through text-kalos-muted"
            )}>
              {task.name}
            </h4>
            {/* Add description below the task name */}
            {task.description && (
              <p className={cn(
                "text-sm text-kalos-muted mb-2",
                task.completed && "line-through"
              )}>
                {task.description}
              </p>
            )}
          </>
        )}

        {/* Task metadata */}
        <div className="flex items-center space-x-4 text-xs text-kalos-muted">
          <span>{task.scheduledTime}</span>
          
          {task.category && (
            <span className={cn("px-2 py-0.5 rounded-full", getCategoryColor(task.category))}>
              {task.category}
            </span>
          )}
          
          <span className={getPriorityColor(task.priority)}>
            {task.priority}
          </span>
          
          {task.recurrencePattern && task.recurrencePattern !== 'daily' && (
            <span>{task.recurrencePattern}</span>
          )}
        </div>
      </div>

      {/* Streak indicator */}
      {task.currentStreak > 0 && (
        <div className="flex items-center mr-3">
          <Flame className="w-4 h-4 text-orange-500 mr-1" />
          <span className="text-sm font-medium">{task.currentStreak}</span>
        </div>
      )}

      {/* Options menu */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="p-1 hover:bg-kalos-border rounded-md transition-colors">
            <MoreVertical className="w-4 h-4 text-kalos-muted" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1 bg-white border-kalos-border">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center w-full px-3 py-2 text-sm hover:bg-kalos-border rounded-md transition-colors"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </PopoverContent>
      </Popover>
    </div>
  )
}