import axios, { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse, ApiResponse } from "../types/api";

const baseURL = import.meta.env.VITE_API_URL || "/api";
const SAFE_METHODS = new Set(["get", "head", "options"]);
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_ENDPOINT = "/auth/csrf";

type CsrfAwareRequestConfig = InternalAxiosRequestConfig & {
  _skipCsrf?: boolean;
  _retriedAfterCsrf?: boolean;
};

type CsrfBootstrapResponse = ApiResponse<{
  csrfToken: string;
}>;

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export function hydrateCsrfToken(token: string | null): void {
  csrfTokenCache = token;
}

export function clearCachedCsrfToken(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

function getHeaderValue(config: InternalAxiosRequestConfig, name: string): string {
  const directValue = config.headers?.get?.(name);
  if (typeof directValue === "string") return directValue;

  const fallback = config.headers?.[name as keyof typeof config.headers];
  return typeof fallback === "string" ? fallback : "";
}

function setHeaderValue(config: InternalAxiosRequestConfig, name: string, value: string): void {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  if (typeof config.headers?.set === "function") {
    config.headers.set(name, value);
    return;
  }

  config.headers = new AxiosHeaders({
    ...(config.headers || {}),
    [name]: value,
  });
}

async function ensureCsrfToken(client: AxiosInstance): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  if (!csrfTokenPromise) {
    csrfTokenPromise = client
      .get<CsrfBootstrapResponse>(CSRF_ENDPOINT, { _skipCsrf: true } as CsrfAwareRequestConfig)
      .then((res) => {
        csrfTokenCache = res.data.data.csrfToken;
        return csrfTokenCache;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
}

function shouldSkipCsrf(config: CsrfAwareRequestConfig): boolean {
  if (config._skipCsrf) return true;

  const method = String(config.method || "get").toLowerCase();
  if (SAFE_METHODS.has(method)) return true;

  const requestedTransport = getHeaderValue(config, "X-Auth-Transport").trim().toLowerCase();
  return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 20_000,
    withCredentials: true,
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const csrfConfig = config as CsrfAwareRequestConfig;
    if (!shouldSkipCsrf(csrfConfig)) {
      const csrfToken = await ensureCsrfToken(client);
      setHeaderValue(config, CSRF_HEADER_NAME, csrfToken);
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorResponse>) => {
      const config = error.config as CsrfAwareRequestConfig | undefined;
      const message = String(error.response?.data?.error?.message || "");
      const isCsrfError = error.response?.status === 403 && message.toLowerCase().includes("csrf");

      if (!config || config._skipCsrf || config._retriedAfterCsrf || !isCsrfError) {
        return Promise.reject(error);
      }

      clearCachedCsrfToken();
      config._retriedAfterCsrf = true;
      const csrfToken = await ensureCsrfToken(client);
      setHeaderValue(config, CSRF_HEADER_NAME, csrfToken);
      return client(config);
    }
  );

  return client;
}
