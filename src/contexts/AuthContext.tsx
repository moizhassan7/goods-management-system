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
  setSessionUser: (user: UserSession | null) => void;
  refetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch the session from the server (checking cookie)
  const fetchSession = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
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
        if (showLoader) setIsLoading(false);
    }
  }, []);

  // Initial session check on mount
  useEffect(() => {
    fetchSession(true);
  }, [fetchSession]);

  const setSessionUser = useCallback((newUser: UserSession | null) => {
    setUser(newUser);
    setIsLoading(false);
  }, []);

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
        window.location.href = '/login';
    }
  }, []);

  // Refetch wrapper without disrupting active UI with a full-screen loading flash
  const refetchSession = useCallback(async () => {
      await fetchSession(false);
  }, [fetchSession]);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, setSessionUser, refetchSession }}>
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
