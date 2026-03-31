import axios from "axios";
import { storage } from "../utils/storage";

const sanitizeApiBaseUrl = (value) => {
  const candidate = String(value || "").trim();

  if (!candidate) {
    return "";
  }

  if (
    candidate.includes("your-backend-url.onrender.com") ||
    candidate.includes("your-backend-domain.onrender.com")
  ) {
    return "";
  }

  return candidate.replace(/\/+$/, "");
};

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

const configuredBaseUrl = sanitizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const resolvedBaseUrl = configuredBaseUrl || resolveDefaultApiBaseUrl();

if (import.meta.env.DEV) {
  console.info("API URL:", resolvedBaseUrl);
}

const apiClient = axios.create({
  baseURL: resolvedBaseUrl,
});

const delay = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
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
  async (error) => {
    const config = error.config || {};
    const isGetRequest = String(config.method || "get").toLowerCase() === "get";
    const shouldRetry =
      !config.__retried &&
      isGetRequest &&
      (!error.response || [502, 503, 504].includes(error.response.status));

    if (shouldRetry) {
      config.__retried = true;
      await delay(350);
      return apiClient(config);
    }

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
