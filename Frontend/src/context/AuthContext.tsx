/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { API_BASE_URL } from '../data/apiConfig';

export interface User {
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'mcl_auth_token';

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenValid(token: string): { valid: boolean; user: User | null } {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return { valid: false, user: null };

  const isExpired = payload.exp * 1000 <= Date.now();
  if (isExpired) return { valid: false, user: null };

  const email = payload.sub || payload.email || 'user';
  const role = payload.role || 'user';
  return { valid: true, user: { email, role } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const initialToken = localStorage.getItem(TOKEN_KEY);
    if (!initialToken) return null;
    const { valid, user: parsedUser } = isTokenValid(initialToken);
    if (valid) return parsedUser;
    localStorage.removeItem(TOKEN_KEY);
    return null;
  });

  useEffect(() => {
    if (token) {
      const { valid, user: parsedUser } = isTokenValid(token);
      if (valid) {
        setUser(parsedUser);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token]);

  async function login(email: string, pass: string) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Invalid email or password' }));
      throw new Error(errorData.detail || 'Invalid email or password');
    }

    const data: { access_token: string; token_type: string; role: string } = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);

    const { valid, user: parsedUser } = isTokenValid(data.access_token);
    if (valid && parsedUser) {
      setUser(parsedUser);
    } else {
      setUser({ email, role: data.role || 'user' });
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
