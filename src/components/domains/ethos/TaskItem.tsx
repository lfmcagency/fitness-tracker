'use client'

import { useState, useEffect } from 'react'
import { EnhancedTask, RecurrencePattern, TaskPriority } from '@/types'
import { Flame, MoreVertical, Edit2, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTaskStore } from '@/store/tasks'
import { format } from 'date-fns'

interface TaskItemProps {
  task: EnhancedTask
  onComplete: (completed: boolean) => void
  onUpdate: (updates: any) => void
  onDelete: () => void
  selectedDate?: Date // New prop for date-specific completion
}

export default function TaskItem({ 
  task, 
  onComplete, 
  onUpdate, 
  onDelete, 
  selectedDate = new Date() 
}: TaskItemProps) {
  const { saveBlankTask, cancelBlankTask } = useTaskStore()
  
  // Auto-edit mode for new tasks
  const [isEditing, setIsEditing] = useState(!!task.isNew)
  const [formData, setFormData] = useState({
    name: task.name || '',
    description: task.description || '',
    timeBlock: task.timeBlock || 'morning',
    priority: task.priority || 'medium',
    category: task.category || 'general',
    recurrencePattern: task.recurrencePattern || 'once',
    customRecurrenceDays: task.customRecurrenceDays || []
  })

  // Focus on name input when editing starts
  useEffect(() => {
    if (isEditing && task.isNew) {
      const nameInput = document.querySelector(`#task-name-${task.id}`) as HTMLInputElement
      if (nameInput) {
        nameInput.focus()
      }
    }
  }, [isEditing, task.isNew, task.id])

  const handleComplete = () => {
    if (!task.isNew) {
      // The completion status is now date-specific
      // task.completed represents whether it's completed on the selected date
      onComplete(!task.completed)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      return // Don't save empty tasks
    }

    if (task.isNew) {
      // Save as new task
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        scheduledTime: getTimeFromBlock(formData.timeBlock),
        recurrencePattern: formData.recurrencePattern,
        customRecurrenceDays: formData.recurrencePattern === 'custom' ? formData.customRecurrenceDays : undefined,
        category: formData.category,
        priority: formData.priority,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }
      
      await saveBlankTask(String(task.id!), taskData)
    } else {
      // Update existing task
      onUpdate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        recurrencePattern: formData.recurrencePattern,
        customRecurrenceDays: formData.recurrencePattern === 'custom' ? formData.customRecurrenceDays : undefined,
      })
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    if (task.isNew) {
      // Cancel new task creation
      cancelBlankTask(String(task.id!))
    } else {
      // Revert changes
      setFormData({
        name: task.name || '',
        description: task.description || '',
        timeBlock: task.timeBlock || 'morning',
        priority: task.priority || 'medium',
        category: task.category || 'general',
        recurrencePattern: task.recurrencePattern || 'once',
        customRecurrenceDays: task.customRecurrenceDays || []
      })
      setIsEditing(false)
    }
  }

  const handleCustomDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      customRecurrenceDays: prev.customRecurrenceDays.includes(day)
        ? prev.customRecurrenceDays.filter(d => d !== day)
        : [...prev.customRecurrenceDays, day].sort()
    }))
  }

  const cyclePriority = () => {
    const priorities: TaskPriority[] = ['low', 'medium', 'high']
    const currentIndex = priorities.indexOf(formData.priority)
    const nextIndex = (currentIndex + 1) % priorities.length
    setFormData(prev => ({ ...prev, priority: priorities[nextIndex] }))
  }

  const cycleCategory = () => {
    const categories = ['general', 'nous', 'soma', 'trophe']
    const currentIndex = categories.indexOf(formData.category)
    const nextIndex = (currentIndex + 1) % categories.length
    setFormData(prev => ({ ...prev, category: categories[nextIndex] }))
  }

  const getTimeFromBlock = (timeBlock: string) => {
    switch (timeBlock) {
      case 'morning': return '09:00'
      case 'afternoon': return '14:00'
      case 'evening': return '20:00'
      default: return '09:00'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'nous': return 'bg-blue-100 text-blue-700'
      case 'soma': return 'bg-green-100 text-green-700'
      case 'trophe': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Check if task is due on selected date
  const isTaskDueOnSelectedDate = () => {
    if (!task.recurrencePattern) return true
    
    const dayOfWeek = selectedDate.getDay()
    
    switch (task.recurrencePattern) {
      case 'once':
        const taskDate = new Date(task.date || task.createdAt || '')
        taskDate.setHours(0, 0, 0, 0)
        selectedDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === selectedDate.getTime()
      case 'daily':
        return true
      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5
      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6
      case 'weekly':
        const originalDate = new Date(task.date || task.createdAt || '')
        return dayOfWeek === originalDate.getDay()
      case 'custom':
        return task.customRecurrenceDays?.includes(dayOfWeek) || false
      default:
        return true
    }
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Don't render tasks that aren't due on the selected date (except when editing new tasks)
  if (!task.isNew && !isTaskDueOnSelectedDate()) {
    return null
  }

  return (
    <div className={cn(
      "bg-white rounded-lg border border-kalos-border p-4 hover:shadow-sm transition-shadow",
      isEditing && "border-2 border-kalos-dark"
    )}>
      <div className="flex items-start">
        {/* Completion checkbox */}
        <button
          onClick={handleComplete}
          disabled={task.isNew}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex-shrink-0 mr-4 mt-0.5",
            "flex items-center justify-center transition-all duration-200",
            task.completed 
              ? "bg-kalos-dark border-kalos-dark" 
              : "border-kalos-muted hover:border-kalos-dark",
            task.isNew && "opacity-50 cursor-not-allowed"
          )}
          title={task.completed 
            ? `Completed on ${format(selectedDate, 'MMM d, yyyy')}` 
            : `Complete for ${format(selectedDate, 'MMM d, yyyy')}`
          }
        >
          {task.completed && (
            <div className="w-2 h-2 bg-white rounded-full" />
          )}
        </button>

        {/* Task content */}
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              {/* Title input */}
              <input
                id={`task-name-${task.id}`}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Task name..."
                className="w-full text-base font-normal bg-transparent border-none outline-none resize-none p-0"
              />

              {/* Description input */}
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description..."
                className="w-full text-sm text-kalos-muted bg-transparent border-none outline-none resize-none p-0 h-8"
              />

              {/* Options row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Time block selector */}
                <Select 
                  value={formData.timeBlock} 
                  onValueChange={(value) => setFormData({ ...formData, timeBlock: value })}
                >
                  <SelectTrigger className="w-auto h-8 px-3 text-xs border-kalos-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-kalos-border">
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>

                {/* Priority cycling badge */}
                <button
                  onClick={cyclePriority}
                  className={cn("px-2 py-1 rounded-full text-xs font-medium transition-colors", getPriorityColor(formData.priority))}
                >
                  {formData.priority} ↻
                </button>

                {/* Category cycling badge */}
                <button
                  onClick={cycleCategory}
                  className={cn("px-2 py-1 rounded-full text-xs font-medium transition-colors", getCategoryColor(formData.category))}
                >
                  {formData.category} ↻
                </button>

                {/* Recurrence selector */}
                <Select 
                  value={formData.recurrencePattern} 
                  onValueChange={(value) => setFormData({ ...formData, recurrencePattern: value as RecurrencePattern })}
                >
                  <SelectTrigger className="w-auto h-8 px-3 text-xs border-kalos-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-kalos-border">
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom days selector */}
              {formData.recurrencePattern === 'custom' && (
                <div className="flex gap-1">
                  {weekDays.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleCustomDayToggle(index)}
                      className={cn(
                        "w-8 h-7 text-xs rounded border transition-colors",
                        formData.customRecurrenceDays.includes(index)
                          ? "bg-kalos-dark text-white border-kalos-dark"
                          : "border-kalos-border hover:border-kalos-dark"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!formData.name.trim()}
                  className="px-3 py-1.5 bg-kalos-dark text-white rounded text-xs font-medium hover:bg-opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 border border-kalos-border text-kalos-muted rounded text-xs font-medium hover:text-kalos-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h4 className={cn(
                "text-base font-normal mb-1",
                task.completed && "line-through text-kalos-muted"
              )}>
                {task.name}
              </h4>
              
              {task.description && (
                <p className={cn(
                  "text-sm text-kalos-muted mb-2",
                  task.completed && "line-through"
                )}>
                  {task.description}
                </p>
              )}

              {/* Task metadata */}
              <div className="flex items-center gap-2 text-xs text-kalos-muted">
                <span className={cn("px-2 py-0.5 rounded-full", getCategoryColor(task.category))}>
                  {task.category}
                </span>
                
                <span className={cn("px-2 py-0.5 rounded-full", getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
                
                {task.recurrencePattern && task.recurrencePattern !== 'once' && (
                  <span>{task.recurrencePattern}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Streak and options (only for existing tasks) */}
        {!isEditing && !task.isNew && (
          <div className="flex items-center gap-2">
            {task.currentStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <span>🔥</span>
                <span className="text-sm font-medium">{task.currentStreak}</span>
              </div>
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 hover:bg-kalos-border rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-kalos-muted" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1 bg-white border-kalos-border">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-kalos-border rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  )
}