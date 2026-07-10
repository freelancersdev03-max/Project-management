import { useState, useEffect } from "react";

export function useAbortableFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const execute = async () => {
      try {
        setLoading(true);
        const res = await fetchFn(controller.signal);
        if (active) {
          setData(res.data);
        }
      } catch (err) {
        if (err.name !== "AbortError" && active) {
          setError(err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    execute();

    return () => {
      active = false;
      controller.abort();
    };
  }, deps);

  return { data, loading, error, setData };
}
