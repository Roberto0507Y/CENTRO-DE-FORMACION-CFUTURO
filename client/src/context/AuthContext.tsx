import React, { createContext, useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { createApiClient } from "../api/axios";
import type { ApiResponse } from "../types/api";
import type { LoginResponse, User } from "../types/auth";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  api: AxiosInstance;
  isLoading: boolean;
  login: (correo: string, password: string) => Promise<User>;
  register: (input: {
    nombres: string;
    apellidos: string;
    correo: string;
    password: string;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion?: string | null;
  }) => Promise<User>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const TOKEN_KEY = "cfuturo_token";

const tokenStore = {
  get() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore storage errors
    }
  },
  remove() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore storage errors
    }
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const api = useMemo(() => createApiClient(() => token), [token]);

  const logout = () => {
    tokenStore.remove();
    setToken(null);
    setUser(null);
  };

  const refreshMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }
    const res = await api.get<ApiResponse<User>>("/auth/me");
    setUser(res.data.data);
  };

  const login = async (correo: string, password: string): Promise<User> => {
    const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", { correo, password });
    const nextToken = res.data.data.token;
    tokenStore.set(nextToken);
    setToken(nextToken);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const register = async (input: {
    nombres: string;
    apellidos: string;
    correo: string;
    password: string;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion?: string | null;
  }): Promise<User> => {
    const res = await api.post<ApiResponse<LoginResponse>>("/auth/register", input);
    const nextToken = res.data.data.token;
    tokenStore.set(nextToken);
    setToken(nextToken);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    token,
    user,
    api,
    isLoading,
    login,
    register,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
