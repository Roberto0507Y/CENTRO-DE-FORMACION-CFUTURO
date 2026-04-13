import React, { createContext, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosInstance } from "axios";
import { clearCachedCsrfToken, createApiClient, hydrateCsrfToken } from "../api/axios";
import type { ApiResponse } from "../types/api";
import type { User, WebAuthResponse } from "../types/auth";

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

const AUTH_SESSION_MARKER = "__cfuturo_http_only_session__";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const api = useMemo(() => createApiClient(), []);

  const clearAuthState = () => {
    setToken(null);
    setUser(null);
  };

  const logout = () => {
    clearAuthState();
    void api
      .post("/auth/logout")
      .catch(() => {
        // Si falla la red, volveremos a validar la sesión al recargar.
      })
      .finally(() => {
        clearCachedCsrfToken();
      });
  };

  const refreshMe = async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const request = api
      .get<ApiResponse<User>>("/auth/me")
      .then((res) => {
        setToken(AUTH_SESSION_MARKER);
        setUser(res.data.data);
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = request;
    return request;
  };

  const login = async (correo: string, password: string): Promise<User> => {
    const res = await api.post<ApiResponse<WebAuthResponse>>("/auth/login", { correo, password });
    setToken(AUTH_SESSION_MARKER);
    hydrateCsrfToken(res.data.data.session.csrfToken);
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
    const res = await api.post<ApiResponse<WebAuthResponse>>("/auth/register", input);
    setToken(AUTH_SESSION_MARKER);
    hydrateCsrfToken(res.data.data.session.csrfToken);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshMe();
      } catch {
        clearAuthState();
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
