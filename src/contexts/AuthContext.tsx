// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Define roles, mirroring lib/auth.ts (or Prisma schema)
export enum UserRole {
    OPERATOR = 'OPERATOR',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN',
}

export interface UserSession {
    id: number;
    username: string;
    role: UserRole;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  logout: () => void;
  // Function to manually update session after login to avoid full page refresh
  refetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch the session from the server (checking cookie)
  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
        // Hitting a simple protected route or a dedicated session check route
        // Since we don't have a dedicated endpoint, we'll create a mock one later
        const response = await fetch('/api/auth/session');
        if (response.ok) {
            const session: UserSession = await response.json();
            setUser(session);
        } else {
            setUser(null);
        }
    } catch (error) {
        console.error("Error fetching session:", error);
        setUser(null);
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Initial session check on mount
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Logout handler
  const logout = useCallback(async () => {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            setUser(null);
            // Redirect to login page immediately on success
            window.location.href = '/login'; 
        } else {
            throw new Error('Logout failed on server.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        toast.error('Logout failed', { description: 'Please try again.' });
    }
  }, []);

  // Simple refetch wrapper
  const refetchSession = async () => {
      await fetchSession();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Auth Hook ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
