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
    const requestUrl = String(config.url || "");
    const isAbsoluteUrl = /^https?:\/\//i.test(requestUrl);

    if (config.url && !/^https?:\/\//i.test(config.url)) {
      const normalized = config.url.startsWith("/") ? config.url : `/${config.url}`;
      const isApiPath = normalized.startsWith("/api/");
      const isMediaOrStaticPath = normalized.startsWith("/media/") || normalized.startsWith("/static/");
      config.url = (isApiPath || isMediaOrStaticPath) ? normalized : `/api${normalized}`;
    }

    const apiOrigin = configuredBaseUrl
      ? (() => {
        try {
          return new URL(configuredBaseUrl).origin;
        } catch {
          return "";
        }
      })()
      : "";
    const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const requestOrigin = isAbsoluteUrl
      ? (() => {
        try {
          return new URL(requestUrl).origin;
        } catch {
          return "";
        }
      })()
      : "";
    const isSameOriginAbsolute = isAbsoluteUrl && (requestOrigin === apiOrigin || requestOrigin === appOrigin);
    const shouldAttachAuth = !isAbsoluteUrl || isSameOriginAbsolute;

    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("access");
    if (token && shouldAttachAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach Organization and Workspace headers for multi-tenancy context
    const orgSlug = localStorage.getItem("org_slug");
    if (orgSlug) {
      config.headers["X-Organization-Slug"] = orgSlug;
    }
    const wsSlug = localStorage.getItem("workspace_slug");
    if (wsSlug) {
      config.headers["X-Workspace-Slug"] = wsSlug;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url || "");
      const isApiRequest = requestUrl.includes("/api/");
      const isBlobResponse = error.config?.responseType === "blob";

      console.error("[API] 401 Unauthorized - request:", requestUrl);

      if (isBlobResponse && error.response?.data instanceof Blob) {
        try {
          const blobText = await error.response.data.text();
          console.error("[API] Blob error payload:", blobText);
        } catch {
          console.error("[API] Response:", error.response.data);
        }
      } else {
        console.error("[API] Response:", error.response.data);
      }

      // Clear token only for authenticated API endpoints; avoid clearing on media/static failures.
      if (isApiRequest) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
      }
    }
    return Promise.reject(error);
  }
);

export default API;
