'use client'

import { useState } from 'react'
import { useTaskStore } from '@/store/tasks'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { RecurrencePattern, TaskPriority } from '@/types/models/tasks'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: () => void
  defaultDate?: Date
}

export default function CreateTaskModal({ 
  isOpen, 
  onClose, 
  onTaskCreated,
  defaultDate = new Date()
}: CreateTaskModalProps) {
  const { addTask } = useTaskStore()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scheduledTime: '',
    recurrencePattern: 'daily' as RecurrencePattern,
    customRecurrenceDays: [] as number[],
    category: 'general',
    priority: 'medium' as TaskPriority,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Task name is required')
      return
    }
    
    if (!formData.scheduledTime) {
      setError('Scheduled time is required')
      return
    }
    
    if (formData.recurrencePattern === 'custom' && formData.customRecurrenceDays.length === 0) {
      setError('Please select at least one day for custom recurrence')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const result = await addTask({
        name: formData.name.trim(),
        description: formData.description.trim(),
        scheduledTime: formData.scheduledTime,
        recurrencePattern: formData.recurrencePattern,
        customRecurrenceDays: formData.recurrencePattern === 'custom' ? formData.customRecurrenceDays : undefined,
        category: formData.category,
        priority: formData.priority,
        date: format(defaultDate, 'yyyy-MM-dd'),
      })
      
      if (result) {
        // Reset form
        setFormData({
          name: '',
          description: '',
          scheduledTime: '',
          recurrencePattern: 'daily',
          customRecurrenceDays: [],
          category: 'general',
          priority: 'medium',
        })
        onTaskCreated()
      }
    } catch (err) {
      setError('Failed to create task')
    } finally {
      setIsSubmitting(false)
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

  const categories = ['general', 'nous', 'soma', 'trophe']
  const priorities: TaskPriority[] = ['low', 'medium', 'high']
  const recurrencePatterns: RecurrencePattern[] = ['daily', 'weekdays', 'weekends', 'weekly', 'custom']
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-kalos-bg border-kalos-border p-6 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Task Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-transparent border-kalos-border focus-visible:ring-kalos-dark"
              placeholder="e.g. Morning meditation"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="description">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-transparent border-kalos-border focus-visible:ring-kalos-dark"
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="time">
                Time *
              </label>
              <Input
                id="time"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="bg-transparent border-kalos-border focus-visible:ring-kalos-dark"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-transparent border-kalos-border focus:ring-kalos-dark">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-kalos-bg border-kalos-border">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
              >
                <SelectTrigger className="bg-transparent border-kalos-border focus:ring-kalos-dark">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-kalos-bg border-kalos-border">
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recurrence</label>
              <Select 
                value={formData.recurrencePattern} 
                onValueChange={(value) => setFormData({ ...formData, recurrencePattern: value as RecurrencePattern })}
              >
                <SelectTrigger className="bg-transparent border-kalos-border focus:ring-kalos-dark">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent className="bg-kalos-bg border-kalos-border">
                  {recurrencePatterns.map((pattern) => (
                    <SelectItem key={pattern} value={pattern}>
                      {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.recurrencePattern === 'custom' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Days</label>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleCustomDayToggle(index)}
                    className={cn(
                      "p-2 text-xs rounded-md border transition-colors",
                      formData.customRecurrenceDays.includes(index)
                        ? "bg-kalos-dark text-white border-kalos-dark"
                        : "border-kalos-border hover:border-kalos-dark"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-kalos-muted text-sm font-medium hover:text-kalos-text"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-kalos-dark text-white rounded-md text-sm font-medium hover:bg-opacity-90 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}