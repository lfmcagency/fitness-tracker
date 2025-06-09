// src/types/api/adminResponses.ts
import { ApiResponse, PaginatedResponse } from './common'

// User types already exist in userResponses.ts, just re-export what we need
export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export interface AdminUsersResponse extends PaginatedResponse<AdminUser> {}