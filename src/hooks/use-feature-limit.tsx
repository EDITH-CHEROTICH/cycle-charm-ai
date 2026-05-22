import { useEffect, useState, useCallback } from "react";
import { usePremium } from "@/hooks/use-premium";

/**
 * Tracks a per-day usage counter in localStorage. Premium users are unlimited.
 * Returns { count, limit, remaining, reached, increment, isPremium }.
 */
export const useFeatureLimit = (key: string, limit: number) => {
  const { isPremium } = usePremium();
  const today = new Date().toISOString().split("T")[0];
  const storageKey = `limit:${key}:${today}`;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(storageKey) || "0", 10);
    setCount(isNaN(stored) ? 0 : stored);
  }, [storageKey]);

  const increment = useCallback(() => {
    if (isPremium) return;
    const next = count + 1;
    setCount(next);
    localStorage.setItem(storageKey, String(next));
  }, [count, storageKey, isPremium]);

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    reached: !isPremium && count >= limit,
    increment,
    isPremium,
  };
};
