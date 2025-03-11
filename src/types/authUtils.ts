import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ApiResponse } from './api/common';
import { IUserProgress } from './models/progress';

/**
 * Authentication levels for API routes
 */
export enum AuthLevel {
  /** User must be authenticated */
  REQUIRED = "required",
  /** In development, auth is optional; in production, it's required */
  DEV_OPTIONAL = "dev_optional",
  /** Any user can access (no auth required) */
  NONE = "none",
  /** Authentication is optional, handler will receive userId if available */
  OPTIONAL = "optional",
}

/**
 * Auth-protected route handler
 */
export type AuthProtectedHandler<T = any, P = {}> = (
  req: NextRequest, 
  userId: string, 
  context?: { params: P }
) => Promise<NextResponse<ApiResponse<T>>>;

/**
 * Authentication wrapper for routes
 */
export type AuthWrapper = <T = any, P = {}>(
  handler: AuthProtectedHandler<T, P>,
  level?: AuthLevel
) => (req: NextRequest, context?: { params: P }) => Promise<NextResponse<ApiResponse<T>>>;

/**
 * Function to get or create user progress
 */
export type UserProgressGetter = (userId: string) => Promise<IUserProgress | null>;

/**
 * Function to check if user has required role
 */
export type RoleChecker = (userId: string, requiredRoles: string[]) => Promise<boolean>;

/**
 * Role-protected handler function
 */
export type RoleProtectedHandlerCreator = (requiredRoles?: string[]) => 
  <T = any>(handler: (req: NextRequest) => Promise<NextResponse<ApiResponse<T>>>) => 
  (req: NextRequest) => Promise<NextResponse<ApiResponse<T>>>;