// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

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
  interface User extends DefaultUser {
    id: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  /** Extend the JWT interface */
  interface JWT {
    id?: string;
    role?: string;
  }
}