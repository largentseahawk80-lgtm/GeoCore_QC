import { useEffect, useRef } from 'react';

/**
 * Custom hook to auto-save state to localStorage.
 * Triggers on:
 * 1. Significant input change (debounced by 1 second)
 * 2. Interval of 15 minutes (fallback safety)
 */
export const useAutoSave = (key: string, data: any) => {
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render to avoid overwriting existing localStorage data 
    // with initial default state before restoration logic runs.
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    
    const saveData = () => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn("Auto-save failed (quota exceeded?)", e);
        }
    };

    // 1. Debounce save on data change (1 second)
    const timeout = setTimeout(saveData, 1000);

    // 2. Interval save (15 minutes) as requested
    const interval = setInterval(saveData, 15 * 60 * 1000);

    return () => {
        clearTimeout(timeout);
        clearInterval(interval);
    };
  }, [key, data]);

  const clearAutoSave = () => {
    localStorage.removeItem(key);
  };

  return { clearAutoSave };
};