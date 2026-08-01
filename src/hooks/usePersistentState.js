import { useCallback, useEffect, useState } from 'react';

function readStoredValue(key, initialValue) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  }

  try {
    const stored = window.localStorage.getItem(key);

    if (stored === null) {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.warn(`Could not read stored state for ${key}`, error);
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  }
}

export default function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readStoredValue(key, initialValue));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Could not save stored state for ${key}`, error);
    }
  }, [key, value]);

  const resetValue = useCallback(() => {
    const nextValue = typeof initialValue === 'function' ? initialValue() : initialValue;
    setValue(nextValue);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Could not remove stored state for ${key}`, error);
      }
    }
  }, [initialValue, key]);

  return [value, setValue, resetValue];
}
