import { Capacitor } from '@capacitor/core';

// Crashlytics is only available on native platforms with the Firebase plugin installed.
// This module provides safe no-op stubs for web builds.

export const initializeCrashlytics = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Crashlytics only available on native platforms');
    return;
  }
  console.log('Crashlytics: native init would happen here');
};

export const logError = async (_error: Error, _context?: string) => {};
export const setUserId = async (_userId: string) => {};
export const logEvent = async (_key: string, _value: string) => {};
export const logBreadcrumb = async (_message: string) => {};
export const testCrash = async () => {};
