'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
}

interface UserInlineEditorProps {
  user: User;
  onSave: (updates: UpdateUserData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UserInlineEditor({ 
  user, 
  onSave, 
  onCancel, 
  isSaving = false 
}: UserInlineEditorProps) {
  
  // Form state - initialize with user data
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    password: '' // Optional password change
  });

  // Track if form has unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  
  // Ref for auto-focusing the name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when component mounts
  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  // Update form data and track changes
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Handle save - only send changed fields
  const handleSave = async () => {
    console.log('💾 [UserInlineEditor] Saving changes for user:', user.id);
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }

    // Build updates object with only changed fields
    const updates: UpdateUserData = {};
    
    if (formData.name !== user.name) updates.name = formData.name.trim();
    if (formData.email !== user.email) updates.email = formData.email.trim();
    if (formData.role !== user.role) updates.role = formData.role;
    if (formData.password.trim()) updates.password = formData.password;

    console.log('📝 [UserInlineEditor] Sending updates:', updates);
    
    try {
      await onSave(updates);
    } catch (error) {
      console.error('💥 [UserInlineEditor] Save failed:', error);
    }
  };

  // Handle cancel - warn if unsaved changes
  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    
    console.log('❌ [UserInlineEditor] Canceling edit');
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

  return (
    <tr className="bg-blue-50" onKeyDown={handleKeyDown}>
      {/* Name Input */}
      <td className="px-4 py-3">
        <Input
          ref={nameInputRef}
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="User name"
          className="font-medium"
          disabled={isSaving}
        />
      </td>
      
      {/* Email Input */}
      <td className="px-4 py-3">
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          placeholder="user@example.com"
          disabled={isSaving}
        />
      </td>
      
      {/* Role Dropdown */}
      <td className="px-4 py-3">
        <select
          value={formData.role}
          onChange={(e) => updateFormData('role', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          disabled={isSaving}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      
      {/* Created Date (Read-only) */}
      <td className="px-4 py-3 text-sm text-[#6B6B6B]">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      
      {/* Action Buttons */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim() || !formData.email.trim()}
            size="sm"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
        
        {/* Password Change Helper */}
        <div className="mt-2">
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
            placeholder="New password (optional)"
            className="text-xs"
            disabled={isSaving}
          />
        </div>
        
        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-blue-600 mt-1">
          Cmd+Enter to save • Esc to cancel
        </div>
      </td>
    </tr>
  );
}