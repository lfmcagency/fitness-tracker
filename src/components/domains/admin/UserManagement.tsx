'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '@/store/admin';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

import { UserRow } from './UserRow';
import { UserInlineEditor } from './UserInlineEditor';
import { UserCreator } from './UserCreator';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function UserManagement() {
  const { 
    users, 
    usersPagination, 
    usersLoading, 
    error, 
    fetchUsers, 
    createUser,
    updateUser,
    deleteUser,
    clearError 
  } = useAdminStore();

  // Mode management state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Refresh function
  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  // Initial fetch
  useEffect(() => {
    refreshUsers();
  }, []);

  // Force clear search on page refresh to prevent browser form persistence
  useEffect(() => {
    setSearchTerm('');
  }, []);

  // Filter users by search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    return (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Handle edit user
  const handleEditUser = (userId: string) => {
    console.log('✏️ [UserManagement] Edit requested for user:', userId);
    setIsCreating(false);
    setEditingUserId(userId);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    console.log('❌ [UserManagement] Canceling edit mode');
    setEditingUserId(null);
  };

  // Update user
  const handleUpdateUser = async (userId: string, updates: any) => {
    console.log('💾 [UserManagement] Updating user:', userId);
    setIsSaving(true);
    
    try {
      const updatedUser = await updateUser(userId, updates);
      if (updatedUser) {
        setEditingUserId(null);
        await refreshUsers(); // Force refresh
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle user role
  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    console.log('🔄 [UserManagement] Toggling role:', userId, currentRole, '→', newRole);
    
    setIsSaving(true);
    try {
      await updateUser(userId, { role: newRole });
      await refreshUsers(); // Force refresh
    } finally {
      setIsSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    
    setDeleting(userId);
    try {
      await deleteUser(userId);
      if (editingUserId === userId) {
        setEditingUserId(null);
      }
    } finally {
      setDeleting(null);
    }
  };

  // Start creating user
  const handleStartCreating = () => {
    console.log('➕ [UserManagement] Starting user creation');
    setEditingUserId(null);
    setIsCreating(true);
  };

  // Cancel creating user  
  const handleCancelCreating = () => {
    console.log('❌ [UserManagement] Canceling user creation');
    setIsCreating(false);
  };

  // Create user
  const handleCreateUser = async (userData: any) => {
    console.log('➕ [UserManagement] Creating user:', userData.email);
    setIsSaving(true);
    
    try {
      const newUser = await createUser(userData);
      if (newUser) {
        setIsCreating(false);
        await refreshUsers(); // Force refresh
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (usersPagination && newPage >= 1 && newPage <= usersPagination.pages) {
      fetchUsers(newPage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">User Management</h2>
        {error && (
          <Button variant="ghost" size="sm" onClick={clearError}>
            Clear Error
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-[#B85C38]/10 border border-[#B85C38]/20 rounded-md">
          <span className="text-[#B85C38] text-sm">{error}</span>
        </div>
      )}

      {/* Search and Create */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {isCreating && (
            <Button 
              variant="outline"
              onClick={handleCancelCreating}
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          
          {!isCreating && (
            <Button 
              onClick={handleStartCreating}
              disabled={usersLoading || isSaving || editingUserId !== null}
            >
              + Create User
            </Button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {usersLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-[#1A1A1A] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-[#6B6B6B] mt-2">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F0EAE4]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#6B6B6B]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0DC]">
                  {/* User Creation Row */}
                  {isCreating && (
                    <UserCreator
                      onSave={handleCreateUser}
                      onCancel={handleCancelCreating}
                      isSaving={isSaving}
                    />
                  )}
                  
                  {/* User Rows */}
                  {filteredUsers.map((user) => {
                    const isEditingThis = editingUserId === user.id;
                    const isDeleting = deleting === user.id;
                    
                    return isEditingThis ? (
                      <UserInlineEditor
                        key={`edit-${user.id}`}
                        user={user}
                        onSave={(updates) => handleUpdateUser(user.id, updates)}
                        onCancel={handleCancelEdit}
                        isSaving={isSaving}
                      />
                    ) : (
                      <UserRow
                        key={user.id}
                        user={user}
                        onEdit={() => handleEditUser(user.id)}
                        onDelete={() => handleDeleteUser(user.id, user.name)}
                        onToggleRole={() => handleToggleRole(user.id, user.role)}
                        disabled={isSaving || usersLoading || isCreating || isDeleting}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {!isCreating && filteredUsers.length === 0 && !usersLoading && (
              <div className="p-8 text-center text-[#6B6B6B]">
                {searchTerm ? 'No users found matching your search' : 'No users found'}
              </div>
            )}

            {/* Pagination */}
            {usersPagination && usersPagination.pages > 1 && (
              <div className="px-4 py-3 border-t border-[#E5E0DC] flex items-center justify-between">
                <span className="text-sm text-[#6B6B6B]">
                  Showing {filteredUsers.length} of {usersPagination.total} users
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(usersPagination.page - 1)}
                    disabled={usersPagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {usersPagination.page} of {usersPagination.pages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(usersPagination.page + 1)}
                    disabled={usersPagination.page === usersPagination.pages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}