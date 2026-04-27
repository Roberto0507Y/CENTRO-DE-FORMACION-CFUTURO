import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AxiosInstance } from "axios";
import { clearCachedCsrfToken, createApiClient, hydrateCsrfToken } from "../api/axios";
import type { ApiResponse } from "../types/api";
import type { RegisterResponse, User, WebAuthResponse } from "../types/auth";
import {
  initializeTabSessionLifecycle,
  markTabActive,
  markTabClosing,
  tabSessionHeartbeatMs,
} from "../utils/tabSessionLifecycle";

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

  const performServerLogout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Si falla la red, volveremos a validar la sesión al recargar.
    } finally {
      clearCachedCsrfToken();
    }
  }, [api]);

  const logout = useCallback(() => {
    clearAuthState();
    void performServerLogout();
  }, [clearAuthState, performServerLogout]);

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
    const {
      tabId,
      shouldLogoutOnFreshOpen,
    } = typeof window !== "undefined"
      ? initializeTabSessionLifecycle()
      : { tabId: "", shouldLogoutOnFreshOpen: false };

    const handleTabActive = () => {
      if (!tabId) return;
      markTabActive(tabId);
    };

    const handleTabClosing = () => {
      if (!tabId) return;
      markTabClosing(tabId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleTabActive();
      }
    };

    const heartbeatId =
      typeof window !== "undefined" && tabId
        ? window.setInterval(handleTabActive, tabSessionHeartbeatMs)
        : null;

    if (typeof window !== "undefined" && tabId) {
      window.addEventListener("focus", handleTabActive);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handleTabClosing);
      window.addEventListener("beforeunload", handleTabClosing);
    }

    const run = async () => {
      try {
        if (shouldLogoutOnFreshOpen) {
          await performServerLogout();
          clearAuthState();
          return;
        }

        await refreshMe();
      } catch {
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    if (!deferBootstrap) {
      void run();
      return () => {
        if (heartbeatId !== null) {
          window.clearInterval(heartbeatId);
        }

        if (typeof window !== "undefined" && tabId) {
          window.removeEventListener("focus", handleTabActive);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          window.removeEventListener("pagehide", handleTabClosing);
          window.removeEventListener("beforeunload", handleTabClosing);
        }
      };
    }

    setIsLoading(false);

    if (typeof window === "undefined") {
      return () => {
        if (heartbeatId !== null) {
          window.clearInterval(heartbeatId);
        }
      };
    }

    if (shouldLogoutOnFreshOpen) {
      void performServerLogout().finally(() => {
        clearAuthState();
      });

      return () => {
        if (heartbeatId !== null) {
          window.clearInterval(heartbeatId);
        }

        window.removeEventListener("focus", handleTabActive);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handleTabClosing);
        window.removeEventListener("beforeunload", handleTabClosing);
      };
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
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
      }

      window.removeEventListener("focus", handleTabActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleTabClosing);
      window.removeEventListener("beforeunload", handleTabClosing);

      if (idleCallback !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleCallback);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [clearAuthState, performServerLogout, refreshMe]);

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
