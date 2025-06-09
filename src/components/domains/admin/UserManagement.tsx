"use client"

import { useEffect, useState } from 'react'
import { useAdminStore } from '@/store/admin'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Trash2, Edit } from 'lucide-react'

export function UserManagement() {
  const { 
    users, 
    usersPagination, 
    usersLoading, 
    error, 
    fetchUsers, 
    deleteUser,
    clearError 
  } = useAdminStore()

  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return
    
    setDeleting(userId)
    await deleteUser(userId)
    setDeleting(null)
  }

  const columns = [
    {
      key: 'name' as const,
      label: 'Name'
    },
    {
      key: 'email' as const,
      label: 'Email',
      render: (value: string) => (
        <span className="text-[#6B6B6B]">{value}</span>
      )
    },
    {
      key: 'role' as const,
      label: 'Role',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
          value === 'admin' 
            ? 'bg-[#B85C38]/20 text-[#B85C38]' 
            : 'bg-[#7D8F69]/20 text-[#7D8F69]'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'createdAt' as const,
      label: 'Created',
      render: (value: string) => (
        <span className="text-[#6B6B6B]">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">User Management</h2>
        {error && (
          <Button variant="ghost" size="sm" onClick={clearError}>
            Clear Error
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-[#B85C38]/10 border border-[#B85C38]/20 rounded-md">
          <span className="text-[#B85C38] text-sm">{error}</span>
        </div>
      )}

      <DataTable
        data={users}
        columns={columns}
        loading={usersLoading}
        searchPlaceholder="Search users..."
        pagination={usersPagination || undefined}
        onPageChange={fetchUsers}
        emptyMessage="No users found"
        actions={(user) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* TODO: Edit modal */}}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(user.id, user.name)}
              disabled={deleting === user.id}
              className="text-[#B85C38] hover:text-[#B85C38] hover:bg-[#B85C38]/10"
            >
              {deleting === user.id ? (
                <div className="w-4 h-4 animate-spin border border-[#B85C38] border-t-transparent rounded-full" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      />
    </div>
  )
}