import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosInstance } from "axios";
import { clearCachedCsrfToken, createApiClient, hydrateCsrfToken } from "../api/axios";
import type { ApiResponse } from "../types/api";
import type { RegisterResponse, User, WebAuthResponse } from "../types/auth";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  api: AxiosInstance;
  isLoading: boolean;
  login: (correo: string, password: string) => Promise<User>;
  register: (input: {
    nombres: string;
    apellidos: string;
    dpi: string;
    correo: string;
    password: string;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion?: string | null;
  }) => Promise<RegisterResponse>;
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

  const clearAuthState = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    void api
      .post("/auth/logout")
      .catch(() => {
        // Si falla la red, volveremos a validar la sesión al recargar.
      })
      .finally(() => {
        clearCachedCsrfToken();
      });
  }, [api, clearAuthState]);

  const refreshMe = useCallback(async () => {
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
  }, [api]);

  const login = useCallback(async (correo: string, password: string): Promise<User> => {
    const res = await api.post<ApiResponse<WebAuthResponse>>("/auth/login", { correo, password });
    setToken(AUTH_SESSION_MARKER);
    hydrateCsrfToken(res.data.data.session.csrfToken);
    setUser(res.data.data.user);
    return res.data.data.user;
  }, [api]);

  const register = useCallback(async (input: {
    nombres: string;
    apellidos: string;
    dpi: string;
    correo: string;
    password: string;
    telefono?: string | null;
    fecha_nacimiento?: string | null;
    direccion?: string | null;
  }): Promise<RegisterResponse> => {
    const res = await api.post<ApiResponse<RegisterResponse>>("/auth/register", input);
    return res.data.data;
  }, [api]);

  useEffect(() => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
    const deferBootstrap =
      pathname === "/" ||
      pathname === "/contact" ||
      pathname === "/courses" ||
      pathname.startsWith("/courses/");

    const run = async () => {
      try {
        await refreshMe();
      } catch {
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    if (!deferBootstrap) {
      void run();
      return;
    }

    setIsLoading(false);

    if (typeof window === "undefined") {
      return;
    }

    const idleCallback = window.requestIdleCallback?.(
      () => {
        void refreshMe().catch(() => {
          clearAuthState();
        });
      },
      { timeout: 1400 },
    );

    const timeoutId =
      idleCallback === undefined
        ? window.setTimeout(() => {
            void refreshMe().catch(() => {
              clearAuthState();
            });
          }, 900)
        : null;

    return () => {
      if (idleCallback !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallback);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      api,
      isLoading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [token, user, api, isLoading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
