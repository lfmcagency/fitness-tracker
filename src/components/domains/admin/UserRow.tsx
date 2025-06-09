'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserRowProps {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onToggleRole: () => void;
  disabled?: boolean;
}

export function UserRow({ 
  user, 
  onEdit, 
  onDelete, 
  onToggleRole,
  disabled = false 
}: UserRowProps) {
  
  // Role styling
  const getRoleStyle = (role: string) => {
    return role === 'admin' 
      ? 'bg-[#B85C38]/20 text-[#B85C38]' 
      : 'bg-[#7D8F69]/20 text-[#7D8F69]';
  };

  return (
    <tr className={`hover:bg-[#F7F3F0] ${disabled ? 'opacity-50' : ''}`}>
      {/* Name */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {user.name}
      </td>
      
      {/* Email */}
      <td className="px-4 py-3 text-sm text-[#6B6B6B]">
        {user.email}
      </td>
      
      {/* Role - Clickable Badge */}
      <td className="px-4 py-3 text-sm">
        <button
          onClick={onToggleRole}
          disabled={disabled}
          className={`
            inline-flex px-2 py-1 rounded-full text-xs font-medium transition-colors
            ${getRoleStyle(user.role)}
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-75'}
          `}
          title="Click to toggle role"
        >
          {user.role}
        </button>
      </td>
      
      {/* Created Date */}
      <td className="px-4 py-3 text-sm text-[#6B6B6B]">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEdit();
            }}
            disabled={disabled}
            title="Edit user"
          >
            ✏️
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={disabled}
            className="text-[#B85C38] hover:text-[#B85C38] hover:bg-[#B85C38]/10"
            title="Delete user"
          >
            🗑️
          </Button>
        </div>
      </td>
    </tr>
  );
}