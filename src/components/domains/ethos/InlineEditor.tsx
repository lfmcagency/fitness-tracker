'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TaskData, RecurrencePattern, TaskPriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface InlineEditorProps {
  task: TaskData;
  onSave: (updates: Partial<TaskData>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function InlineEditor({ 
  task, 
  onSave, 
  onCancel, 
  isSaving = false 
}: InlineEditorProps) {
  
  // Form state - initialize with task data
  const [formData, setFormData] = useState({
    name: task.name,
    description: task.description || '',
    scheduledTime: task.scheduledTime,
    category: task.category,
    priority: task.priority as TaskPriority,
    recurrencePattern: task.recurrencePattern as RecurrencePattern,
    customRecurrenceDays: task.customRecurrenceDays || []
  });

  // Track if form has unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  
  // Ref for auto-focusing the name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when component mounts
  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select(); // Select all text for easy editing
  }, []);

  // Update form data and track changes
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Handle save - only send changed fields
  const handleSave = async () => {
    console.log('💾 [InlineEditor] Saving changes for task:', task.id);
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Task name is required');
      return;
    }

    // Build updates object with only changed fields
    const updates: Partial<TaskData> = {};
    
    if (formData.name !== task.name) updates.name = formData.name.trim();
    if (formData.description !== (task.description || '')) updates.description = formData.description;
    if (formData.scheduledTime !== task.scheduledTime) updates.scheduledTime = formData.scheduledTime;
    if (formData.category !== task.category) updates.category = formData.category;
    if (formData.priority !== task.priority) updates.priority = formData.priority;
    if (formData.recurrencePattern !== task.recurrencePattern) updates.recurrencePattern = formData.recurrencePattern;
    
    // Only include customRecurrenceDays if pattern is custom and it changed
    if (formData.recurrencePattern === 'custom' && 
        JSON.stringify(formData.customRecurrenceDays) !== JSON.stringify(task.customRecurrenceDays)) {
      updates.customRecurrenceDays = formData.customRecurrenceDays;
    }

    console.log('📝 [InlineEditor] Sending updates:', updates);
    
    try {
      await onSave(updates);
    } catch (error) {
      console.error('💥 [InlineEditor] Save failed:', error);
    }
  };

  // Handle cancel - warn if unsaved changes
  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    
    console.log('❌ [InlineEditor] Canceling edit');
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
    const newDays = formData.customRecurrenceDays.includes(day)
      ? formData.customRecurrenceDays.filter(d => d !== day)
      : [...formData.customRecurrenceDays, day].sort();
    
    updateFormData('customRecurrenceDays', newDays);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div 
      className="border-l-4 border-l-blue-500 bg-blue-50 rounded-r-lg p-4 space-y-4"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <span>✏️</span>
        <span className="font-medium">Editing Task</span>
        <span className="text-xs text-blue-600 ml-auto">
          Cmd+Enter to save • Esc to cancel
        </span>
      </div>

      {/* Task Name */}
      <div>
        <Input
          ref={nameInputRef}
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="Task name"
          className="font-medium"
          disabled={isSaving}
        />
      </div>

      {/* Description */}
      <div>
        <Textarea
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Add a description (optional)"
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
            <option value="weekdays">Weekdays</option>
            <option value="weekends">Weekends</option>
            <option value="weekly">Weekly</option>
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
                onClick={() => toggleCustomDay(index)}
                disabled={isSaving}
                className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${formData.customRecurrenceDays.includes(index)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {dayName}
              </button>
            ))}
          </div>
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
          disabled={isSaving || !formData.name.trim()}
          size="sm"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {/* Changes Indicator */}
      {hasChanges && !isSaving && (
        <div className="text-xs text-blue-600">
          • Unsaved changes
        </div>
      )}
    </div>
  );
}