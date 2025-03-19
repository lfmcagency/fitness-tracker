'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  clearError: () => {},
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if user is authenticated
  const isAuthenticated = !!user;
  
  // Clear error message
  const clearError = () => setError(null);
  
  // Load user from storage or session on initial render
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        
        // First check if we have a stored user in localStorage/sessionStorage
        const storedUser = localStorage.getItem('kalos_user') || sessionStorage.getItem('kalos_user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
          // If no stored user, try to fetch from the session API
          const response = await fetch('/api/user/profile');
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setUser(data.data);
              // Store in localStorage for persistence across page reloads
              localStorage.setItem('kalos_user', JSON.stringify(data.data));
            }
          } else {
            // Session doesn't exist or is invalid
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Login function
  const login = async (email: string, password: string, remember: boolean = false) => {
    try {
      setIsLoading(true);
      clearError();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        
        // Store user data for persistence
        if (remember) {
          localStorage.setItem('kalos_user', JSON.stringify(data.data.user));
        } else {
          sessionStorage.setItem('kalos_user', JSON.stringify(data.data.user));
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register function
  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      clearError();
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        
        // Store in sessionStorage by default for new registrations
        sessionStorage.setItem('kalos_user', JSON.stringify(data.data.user));
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Call the logout API if exists (for server-side session cleanup)
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        // Continue even if API call fails
        console.warn('Logout API call failed:', e);
      }
      
      // Clear local storage
      localStorage.removeItem('kalos_user');
      sessionStorage.removeItem('kalos_user');
      
      // Clear user state
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during logout');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
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