/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  userId: string | null;
  role: string | null;
  loading: boolean;
  setAuth: (token: string, userId: string, role: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserId = localStorage.getItem('user-id');
    const storedRole = localStorage.getItem('role');

    if (storedToken && storedUserId && storedRole) {
      setToken(storedToken);
      setUserId(storedUserId);
      setRole(storedRole);
    } else {
      // cleanup in case of inconsistent data
      localStorage.removeItem('authToken');
      localStorage.removeItem('user-id');
      localStorage.removeItem('role');
    }

    setHydrated(true);
  }, []);

  const setAuth = (newToken: string, newUserId: string, newRole: string) => {
    setToken(newToken);
    setUserId(newUserId);
    setRole(newRole);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('user-id', newUserId);
    localStorage.setItem('role', newRole);
  };

  const signOut = () => {
    setToken(null);
    setUserId(null);
    setRole(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user-id');
    localStorage.removeItem('role');
  };

  const value = {
    token,
    userId,
    role,
    loading: !hydrated,
    setAuth,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
