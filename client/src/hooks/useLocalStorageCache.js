import { useState, useEffect, useRef } from "react";

export function useLocalStorageCache(key, fetchFn, ttlMs = 5 * 60 * 1000) {
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { value, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttlMs) {
        return value;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("Failed to parse cache for key", key, e);
    }
    return null;
  });

  const [loading, setLoading] = useState(!data);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetchFnRef.current();
        if (active) {
          setData(res.data);
          localStorage.setItem(
            key,
            JSON.stringify({ value: res.data, timestamp: Date.now() })
          );
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Cache fetch failed for", key, err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (!data) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [key, data]);

  const invalidate = () => {
    localStorage.removeItem(key);
    setData(null);
  };

  return [data, loading, setData, invalidate];
}
