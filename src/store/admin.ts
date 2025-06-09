// src/store/admin.ts
import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  pages: number
}

interface ImportResult {
  total: number
  created: number
  updated: number
  errors: string[]
}

interface CreateUserData {
  name: string
  email: string
  password: string
  role?: string
}

interface UpdateUserData {
  name?: string
  email?: string
  role?: string
  password?: string
}

interface AdminState {
  // User management
  users: User[]
  usersPagination: PaginationInfo | null
  usersLoading: boolean
  
  // CSV import
  importProgress: {
    exercises: { loading: boolean; result: ImportResult | null }
    foods: { loading: boolean; result: ImportResult | null }
  }
  
  // General
  error: string | null
  
  // Actions
  fetchUsers: (page?: number, limit?: number) => Promise<void>
  createUser: (userData: CreateUserData) => Promise<User | null>
  updateUser: (userId: string, userData: UpdateUserData) => Promise<User | null>
  deleteUser: (userId: string) => Promise<void>
  importExercises: (file: File) => Promise<void>
  importFoods: (file: File) => Promise<void>
  clearError: () => void
  clearImportResults: () => void
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  users: [],
  usersPagination: null,
  usersLoading: false,
  importProgress: {
    exercises: { loading: false, result: null },
    foods: { loading: false, result: null }
  },
  error: null,

  // Fetch users with pagination
  fetchUsers: async (page = 1, limit = 20) => {
    set({ usersLoading: true, error: null })
    
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      
      set({
        users: data.data.items,
        usersPagination: data.data.pagination,
        usersLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        usersLoading: false
      })
    }
  },

  // Create new user
  createUser: async (userData: CreateUserData) => {
    set({ error: null })
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) throw new Error('Failed to create user')
      
      const data = await response.json()
      const newUser = data.data
      
      // Add to local state
      set(state => ({
        users: [newUser, ...state.users]
      }))
      
      return newUser
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create user'
      })
      return null
    }
  },

  // Update user
  updateUser: async (userId: string, userData: UpdateUserData) => {
    set({ error: null })
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) throw new Error('Failed to update user')
      
      const data = await response.json()
      const updatedUser = data.data
      
      // Update in local state
      set(state => ({
        users: state.users.map(user => 
          user.id === userId ? updatedUser : user
        )
      }))
      
      return updatedUser
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update user'
      })
      return null
    }
  },

  // Delete user
  deleteUser: async (userId: string) => {
    set({ error: null })
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete user')
      
      // Remove from local state
      set(state => ({
        users: state.users.filter(u => u.id !== userId)
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete user'
      })
    }
  },

  // Import exercises CSV
  importExercises: async (file: File) => {
    set(state => ({
      importProgress: {
        ...state.importProgress,
        exercises: { loading: true, result: null }
      },
      error: null
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/exercises/import', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Import failed')
      
      const data = await response.json()
      
      set(state => ({
        importProgress: {
          ...state.importProgress,
          exercises: { loading: false, result: data.data }
        }
      }))
    } catch (error) {
      set(state => ({
        importProgress: {
          ...state.importProgress,
          exercises: { loading: false, result: null }
        },
        error: error instanceof Error ? error.message : 'Import failed'
      }))
    }
  },

  // Import foods CSV  
  importFoods: async (file: File) => {
    set(state => ({
      importProgress: {
        ...state.importProgress,
        foods: { loading: true, result: null }
      },
      error: null
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/foods/import', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Import failed')
      
      const data = await response.json()
      
      set(state => ({
        importProgress: {
          ...state.importProgress,
          foods: { loading: false, result: data.data }
        }
      }))
    } catch (error) {
      set(state => ({
        importProgress: {
          ...state.importProgress,
          foods: { loading: false, result: null }
        },
        error: error instanceof Error ? error.message : 'Import failed'
      }))
    }
  },

  clearError: () => set({ error: null }),
  
  clearImportResults: () => set({
    importProgress: {
      exercises: { loading: false, result: null },
      foods: { loading: false, result: null }
    }
  })
}))