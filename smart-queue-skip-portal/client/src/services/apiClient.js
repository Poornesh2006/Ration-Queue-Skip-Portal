import axios from "axios";
import { storage } from "../utils/storage";

const resolveDefaultApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5000/api";
  }

  const { hostname, port, origin } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalHost && port !== "5000") {
    return "http://localhost:5000/api";
  }

  return `${origin}/api`;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || resolveDefaultApiBaseUrl(),
});

apiClient.interceptors.request.use((config) => {
  const auth = storage.getAuth();

  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storage.clearAuth();

      if (typeof window !== "undefined") {
        const target = window.location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
        if (window.location.pathname !== target) {
          window.location.replace(target);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
