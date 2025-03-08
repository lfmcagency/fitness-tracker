// src/types/api/authResponses.ts
import { ApiResponse } from './common';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'user' | 'admin' | 'trainer';
  settings?: {
    weightUnit: 'kg' | 'lbs';
    lengthUnit?: 'cm' | 'in';
    theme?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  image?: string;
}

// Changed from interface to type alias
export type AuthResponse = ApiResponse<{
  user: UserProfile;
  token?: string;
}>;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}