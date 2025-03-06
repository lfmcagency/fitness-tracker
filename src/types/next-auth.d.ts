// Re-export common types
export * from './api/common';
export * from './api/pagination';
export * from './validation';

// This file will grow as we add more type definitions in future sprints

// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession['user'];
  }
  
  /**
   * Extend the built-in user types
   */
  interface User {
    id: string;
    role?: string;
  }
}