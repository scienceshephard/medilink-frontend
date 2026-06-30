"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const memo = useCallback(fetcher, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await memo());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [memo]);

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run, setData };
}
