"use client";

import * as React from "react";

/**
 * Keyed async query. A new `key` triggers a fetch; loading/error are derived
 * from whether the latest result belongs to the current key, so no state is
 * set synchronously inside effects. Pass `null` to pause. Previous data is
 * kept while a new key loads, for smooth "refreshing" states.
 */
export function useApiQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [nonce, setNonce] = React.useState(0);
  const [result, setResult] = React.useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const fullKey = key === null ? null : `${key}#${nonce}`;

  React.useEffect(() => {
    if (fullKey === null) return;
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => setResult({ key: fullKey, data }),
      (error: Error) => {
        if (error?.name !== "AbortError") setResult((prev) => ({ key: fullKey, data: prev.data, error: error?.message ?? "Request failed" }));
      },
    );
    return () => controller.abort();
  }, [fullKey]);

  const settled = result.key === fullKey;
  return {
    data: result.data,
    error: settled ? (result.error ?? null) : null,
    loading: fullKey !== null && !settled,
    retry: React.useCallback(() => setNonce((n) => n + 1), []),
  };
}

/** Value that only updates after `delayMs` without changes. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
