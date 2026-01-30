import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEYS = {
  USER: "cc_cached_user",
  PROFILE: "cc_cached_profile",
  CYCLE_DATA: "cc_cached_cycle_data",
  PERIOD_LOGS: "cc_cached_period_logs",
  SYMPTOMS: "cc_cached_symptoms",
  DAILY_LOGS: "cc_cached_daily_logs",
  LAST_SYNC: "cc_last_sync",
};

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsInitialized(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, isInitialized };
};

// Cache user data to localStorage
export const cacheUserData = async (userId: string) => {
  try {
    const [profileRes, cycleRes, periodRes, symptomsRes, dailyRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("cycle_data").select("*").eq("user_id", userId).single(),
      supabase.from("period_logs").select("*").eq("user_id", userId).order("start_date", { ascending: false }).limit(50),
      supabase.from("symptoms").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("daily_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }).limit(30),
    ]);

    if (profileRes.data) {
      localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(profileRes.data));
    }
    if (cycleRes.data) {
      localStorage.setItem(CACHE_KEYS.CYCLE_DATA, JSON.stringify(cycleRes.data));
    }
    if (periodRes.data) {
      localStorage.setItem(CACHE_KEYS.PERIOD_LOGS, JSON.stringify(periodRes.data));
    }
    if (symptomsRes.data) {
      localStorage.setItem(CACHE_KEYS.SYMPTOMS, JSON.stringify(symptomsRes.data));
    }
    if (dailyRes.data) {
      localStorage.setItem(CACHE_KEYS.DAILY_LOGS, JSON.stringify(dailyRes.data));
    }

    localStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
    console.log("User data cached successfully");
  } catch (error) {
    console.error("Error caching user data:", error);
  }
};

// Cache the current user session
export const cacheUserSession = (user: any) => {
  if (user) {
    localStorage.setItem(CACHE_KEYS.USER, JSON.stringify({ id: user.id, email: user.email }));
  }
};

// Get cached user
export const getCachedUser = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.USER);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// Get cached profile
export const getCachedProfile = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// Get cached cycle data
export const getCachedCycleData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.CYCLE_DATA);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// Get cached period logs
export const getCachedPeriodLogs = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.PERIOD_LOGS);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

// Get cached symptoms
export const getCachedSymptoms = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.SYMPTOMS);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

// Get cached daily logs
export const getCachedDailyLogs = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.DAILY_LOGS);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

// Check if user has cached data (completed onboarding)
export const hasCachedUserData = () => {
  const user = getCachedUser();
  const profile = getCachedProfile();
  const cycleData = getCachedCycleData();
  return !!(user && profile && cycleData);
};

// Clear all cached data (for logout)
export const clearCachedData = () => {
  Object.values(CACHE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

// Get last sync timestamp
export const getLastSync = () => {
  return localStorage.getItem(CACHE_KEYS.LAST_SYNC);
};
