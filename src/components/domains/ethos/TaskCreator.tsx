'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CreateTaskParams, RecurrencePattern, TaskPriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TaskCreatorProps {
  timeBlock: 'morning' | 'afternoon' | 'evening';
  defaultScheduledTime: string;
  selectedDate: string;
  onSave: (taskData: CreateTaskParams) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function TaskCreator({ 
  timeBlock,
  defaultScheduledTime,
  selectedDate,
  onSave, 
  onCancel, 
  isSaving = false 
}: TaskCreatorProps) {
  
  // Form state - initialize with defaults
  const [formData, setFormData] = useState<CreateTaskParams>({
    name: '',
    description: '',
    scheduledTime: defaultScheduledTime,
    category: 'general',
    priority: 'medium' as TaskPriority,
    recurrencePattern: 'daily' as RecurrencePattern,
    customRecurrenceDays: []
  });

  // Ref for auto-focusing the name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when component mounts
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Update form data
  const updateFormData = (field: keyof CreateTaskParams, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    console.log('➕ [TaskCreator] Creating new task:', formData.name);
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Task name is required');
      nameInputRef.current?.focus();
      return;
    }

    // Clean up data before sending
    const cleanedData: CreateTaskParams = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      // Only include customRecurrenceDays if pattern is custom and has days
      customRecurrenceDays: formData.recurrencePattern === 'custom' 
        ? formData.customRecurrenceDays 
        : undefined
    };

    console.log('📝 [TaskCreator] Sending task data:', cleanedData);
    
    try {
      await onSave(cleanedData);
    } catch (error) {
      console.error('💥 [TaskCreator] Create failed:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // If user has typed anything, confirm cancellation
    if (formData.name.trim() || formData.description?.trim()) {
      const confirmed = window.confirm('Discard new task?');
      if (!confirmed) return;
    }
    
    console.log('❌ [TaskCreator] Canceling task creation');
    onCancel();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Custom recurrence days handling
  const toggleCustomDay = (day: number) => {
    const newDays = formData.customRecurrenceDays?.includes(day)
      ? formData.customRecurrenceDays.filter(d => d !== day)
      : [...(formData.customRecurrenceDays || []), day].sort();
    
    updateFormData('customRecurrenceDays', newDays);
  };

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayValues = [1, 2, 3, 4, 5, 6, 0];

  // Get time block icon for visual context
  const getTimeBlockIcon = () => {
    switch (timeBlock) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌙';
      default: return '📝';
    }
  };

  return (
    <div 
      className="border-l-4 border-l-green-500 bg-green-50 rounded-r-lg p-4 space-y-4"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-green-700">
        <span>{getTimeBlockIcon()}</span>
        <span className="font-medium">New {timeBlock} task</span>
        <span className="text-xs text-green-600 ml-auto">
          Cmd+Enter to save • Esc to cancel
        </span>
      </div>

      {/* Task Name */}
      <div>
        <Input
          ref={nameInputRef}
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="What do you want to accomplish?"
          className="font-medium"
          disabled={isSaving}
        />
      </div>

      {/* Description */}
      <div>
        <Textarea
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Add details about this task (optional)"
          rows={2}
          className="resize-none"
          disabled={isSaving}
        />
      </div>

      {/* Time and Category Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Scheduled Time
          </label>
          <Input
            type="time"
            value={formData.scheduledTime}
            onChange={(e) => updateFormData('scheduledTime', e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category
          </label>
          <Input
            value={formData.category}
            onChange={(e) => updateFormData('category', e.target.value)}
            placeholder="general"
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Priority and Recurrence Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => updateFormData('priority', e.target.value as TaskPriority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isSaving}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Recurrence
          </label>
          <select
            value={formData.recurrencePattern}
            onChange={(e) => updateFormData('recurrencePattern', e.target.value as RecurrencePattern)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isSaving}
          >
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Custom Recurrence Days */}
      {formData.recurrencePattern === 'custom' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Custom Days
          </label>
          <div className="flex gap-1">
            {dayNames.map((dayName, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleCustomDay(dayValues[index])}
                disabled={isSaving}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${formData.customRecurrenceDays?.includes(dayValues[index])
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {dayName}
              </button>
            ))}
          </div>
          {formData.customRecurrenceDays?.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Select at least one day for custom recurrence
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
          size="sm"
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={isSaving || !formData.name.trim() || 
            (formData.recurrencePattern === 'custom' && (!formData.customRecurrenceDays || formData.customRecurrenceDays.length === 0))}
          size="sm"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Task'
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <div className="text-xs text-gray-500">
        This task will be created for {selectedDate}
      </div>
    </div>
  );
}