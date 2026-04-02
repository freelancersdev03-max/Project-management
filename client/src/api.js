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
      console.log(`[API] Authorization header set for ${config.url}`);
    } else {
      console.warn(`[API] No access_token found in localStorage for ${config.url}. Request may fail with 401.`);
      console.log("[API] Available localStorage keys:", Object.keys(localStorage));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[API] 401 Unauthorized - Token may be expired or invalid");
      console.error("[API] Response:", error.response.data);
      // Optionally redirect to login
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
    }
    return Promise.reject(error);
  }
);

export default API;
