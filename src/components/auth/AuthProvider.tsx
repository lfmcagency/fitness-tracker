'use client';

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Define the interface for our user
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
}

// Define the auth context interface
interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  clearError: () => {},
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Main AuthProvider that includes SessionProvider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
};

// Inner provider that implements our auth logic using NextAuth
const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  
  // Map NextAuth session to our expected format
  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    role: session.user.role || 'user',
    image: session.user.image || null,
  } : null;
  
  // Clear error message
  const clearError = useCallback(() => setError(null), []);
  
  // Login using NextAuth
  const login = async (email: string, password: string, remember: boolean = false) => {
    try {
      clearError();
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/dashboard'
      });
      
      if (result?.error) {
        setError(result.error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      return false;
    }
  };
  
  // Register user through our custom endpoint and then login
  const register = async (name: string, email: string, password: string) => {
    try {
      clearError();
      
      // Call our renamed registration endpoint
      const response = await fetch('/api/auth-custom/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Registration failed');
        return false;
      }
      
      // Auto login after successful registration
      return login(email, password);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      return false;
    }
  };
  
  // Logout using NextAuth
  const logout = async () => {
    try {
      await signOut({ redirect: false });
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during logout');
    }
  };
  
  // Create the context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: status === 'loading',
    error,
    login,
    register,
    logout,
    clearError,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthProvider;