import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export function createApiClient(getToken: () => string | null): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 20_000,
    withCredentials: true,
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  return client;
}