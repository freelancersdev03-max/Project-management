import api from "../api";

export async function getCachedData(url, config = {}, ttlMs = 5 * 60 * 1000) {
  const paramsKey = config.params ? `_${JSON.stringify(config.params)}` : '';
  const cacheKey = `api_cache_${url}${paramsKey}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { value, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttlMs) {
        if (import.meta.env.DEV) console.log(`[Cache Hit] Serving ${url} from localStorage`);
        return { data: value };
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Failed to read from api cache for", url, e);
  }

  if (import.meta.env.DEV) console.log(`[Cache Miss] Fetching ${url} from network`);
  const res = await api.get(url, config);
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ value: res.data, timestamp: Date.now() }));
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Failed to write to api cache for", url, e);
  }
  return res;
}

export function invalidateCache(url) {
  const cacheKey = `api_cache_${url}`;
  localStorage.removeItem(cacheKey);
}
