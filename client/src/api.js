import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

if (!configuredBaseUrl && import.meta.env.DEV) {
  console.warn("[api] VITE_API_BASE_URL is not set — API calls may fail.");
}

const API = axios.create({
  baseURL: configuredBaseUrl.replace(/\/+$/, ""),
});

API.interceptors.request.use(
  (config) => {
    if (config.url && !/^https?:\/\//i.test(config.url)) {
      const normalized = config.url.startsWith("/") ? config.url : `/${config.url}`;
      config.url = normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
    }

    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
