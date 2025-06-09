'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

interface UserCreatorProps {
  onSave: (userData: CreateUserData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function UserCreator({ 
  onSave, 
  onCancel, 
  isSaving = false 
}: UserCreatorProps) {
  
  // Form state - initialize with defaults
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  // Ref for auto-focusing the name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when component mounts
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Update form data
  const updateFormData = (field: keyof CreateUserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    console.log('➕ [UserCreator] Creating new user:', formData.email);
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Name is required');
      nameInputRef.current?.focus();
      return;
    }
    
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!formData.password.trim()) {
      alert('Password is required');
      return;
    }

    // Clean up data before sending
    const cleanedData: CreateUserData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role
    };

    console.log('📝 [UserCreator] Sending user data:', { ...cleanedData, password: '[HIDDEN]' });
    
    try {
      await onSave(cleanedData);
    } catch (error) {
      console.error('💥 [UserCreator] Create failed:', error);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // If user has typed anything, confirm cancellation
    if (formData.name.trim() || formData.email.trim() || formData.password.trim()) {
      const confirmed = window.confirm('Discard new user?');
      if (!confirmed) return;
    }
    
    console.log('❌ [UserCreator] Canceling user creation');
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

  // Check if form is valid
  const isFormValid = formData.name.trim() && formData.email.trim() && formData.password.trim();

  return (
    <tr className="bg-green-50" onKeyDown={handleKeyDown}>
      {/* Name Input */}
      <td className="px-4 py-3">
        <Input
          ref={nameInputRef}
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="Full name"
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
      
      {/* Created Date (Placeholder) */}
      <td className="px-4 py-3 text-sm text-[#6B6B6B]">
        <span className="italic">New user</span>
      </td>
      
      {/* Action Buttons */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2 mb-2">
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
            disabled={isSaving || !isFormValid}
            size="sm"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
        
        {/* Password Input */}
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          placeholder="Password"
          className="text-sm"
          disabled={isSaving}
        />
        
        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-green-600 mt-1">
          Cmd+Enter to save • Esc to cancel
        </div>
      </td>
    </tr>
  );
}