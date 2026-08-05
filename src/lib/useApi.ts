"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const memo = useCallback(fetcher, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // `isCurrent` guards every state write: when deps change quickly, a slow
  // earlier request can settle after a fast later one and clobber it with
  // stale data. The effect below invalidates superseded runs.
  const run = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      setLoading(true);
      setError(null);
      try {
        const result = await memo();
        if (isCurrent()) setData(result);
      } catch (err) {
        if (isCurrent()) setError(err instanceof ApiError ? err.message : "Failed to load data.");
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [memo],
  );

  useEffect(() => {
    let cancelled = false;
    run(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [run]);

  // Wrapped so callers can pass it straight to an event handler without the
  // event object being mistaken for the `isCurrent` predicate.
  const reload = useCallback(() => run(), [run]);

  return { data, error, loading, reload, setData };
}
