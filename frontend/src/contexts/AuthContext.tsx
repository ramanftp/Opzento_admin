import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types/user';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const checkAuth = useCallback(async () => {
  setIsLoading(true);

  const token = localStorage.getItem("token");

  console.log("Token:", token);

  if (!token) {
    console.log("No token found");
    setUser(null);
    setIsLoading(false);
    return;
  }

  try {
    console.log("Calling /api/auth/me");

    const currentUser = await authService.getCurrentUser();

    console.log("Current User:", currentUser);

    setUser(currentUser);
    setError(null);
  } catch (err: any) {
    console.error("Auth check failed:", err);
    console.error("Response:", err.response);

    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      setUser(null);
    }

    setError(err.response?.data?.detail || "Failed to load user");
  } finally {
    setIsLoading(false);
  }
}, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      localStorage.setItem('token', response.access_token);
      setUser(response.user);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
const logout = useCallback(async () => {
  try {
    await authService.logout();
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  }
}, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading, 
        error,
        login, 
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
