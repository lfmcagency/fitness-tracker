// src/types/api/adminResponses.ts
import { ApiResponse } from './common'
import type { PaginatedResponse } from './pagination'

// User types already exist in userResponses.ts, just re-export what we need
export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export type AdminUsersResponse = PaginatedResponse<AdminUser>