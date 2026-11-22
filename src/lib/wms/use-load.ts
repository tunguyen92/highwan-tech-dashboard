"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads data with a loader function and re-runs whenever `deps` change or `reload()` is called.
 * The loader should return null on failure (see `unwrap`), which leaves `data` as null.
 */
export function useLoad<T>(loader: () => Promise<T | null>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the caller controls when to reload through `deps`
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loader().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, reload };
}

export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
