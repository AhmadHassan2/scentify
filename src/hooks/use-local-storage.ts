"use client";

import * as React from "react";

/**
 * localStorage-backed state via useSyncExternalStore: renders the server
 * fallback during hydration (no mismatch), then the stored value, and stays
 * in sync across tabs. For per-device conveniences only.
 */

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = () => {
    cache.clear();
    callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  try {
    value = raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    value = fallback;
  }
  cache.set(key, { raw, value });
  return value;
}

export function setLocalValue(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode); ignore.
  }
  cache.delete(key);
  listeners.forEach((l) => l());
}

export function useLocalStorageValue<T>(key: string, fallback: T): T {
  // Stable fallback identity so snapshots compare equal between renders.
  const [stableFallback] = React.useState(fallback);
  return React.useSyncExternalStore(
    subscribe,
    () => read(key, stableFallback),
    () => stableFallback,
  );
}
