import { useState, useCallback } from 'react';

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function usePersistedFilter<T>(key: string, fallback: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => getStored(key, fallback));

  const set = useCallback((val: T) => {
    setValue(val);
    if (val === fallback || val === undefined || val === null || val === '') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }, [key, fallback]);

  return [value, set];
}

export function clearPersistedFilters(prefix: string) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
  keys.forEach(k => localStorage.removeItem(k));
}
