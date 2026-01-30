import { Capacitor } from '@capacitor/core';

let FirebaseCrashlytics: any = null;

export const initializeCrashlytics = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Crashlytics only available on native platforms');
    return;
  }

  try {
    const crashlyticsModule = await import('@capacitor-firebase/crashlytics');
    FirebaseCrashlytics = crashlyticsModule.FirebaseCrashlytics;
    
    // Enable crash collection
    await FirebaseCrashlytics.setEnabled({ enabled: true });
    console.log('Firebase Crashlytics initialized');
  } catch (error) {
    console.error('Error initializing Crashlytics:', error);
  }
};

export const logError = async (error: Error, context?: string) => {
  if (!Capacitor.isNativePlatform() || !FirebaseCrashlytics) return;

  try {
    await FirebaseCrashlytics.recordException({
      message: `${context ? `[${context}] ` : ''}${error.message}`,
    });
  } catch (e) {
    console.error('Error logging to Crashlytics:', e);
  }
};

export const setUserId = async (userId: string) => {
  if (!Capacitor.isNativePlatform() || !FirebaseCrashlytics) return;

  try {
    await FirebaseCrashlytics.setUserId({ userId });
  } catch (error) {
    console.error('Error setting Crashlytics user ID:', error);
  }
};

export const logEvent = async (key: string, value: string) => {
  if (!Capacitor.isNativePlatform() || !FirebaseCrashlytics) return;

  try {
    await FirebaseCrashlytics.setCustomKey({ key, value, type: 'string' });
  } catch (error) {
    console.error('Error logging Crashlytics event:', error);
  }
};

export const logBreadcrumb = async (message: string) => {
  if (!Capacitor.isNativePlatform() || !FirebaseCrashlytics) return;

  try {
    await FirebaseCrashlytics.log({ message });
  } catch (error) {
    console.error('Error logging Crashlytics breadcrumb:', error);
  }
};

// Force a test crash (only use in development)
export const testCrash = async () => {
  if (!Capacitor.isNativePlatform() || !FirebaseCrashlytics) return;

  try {
    await FirebaseCrashlytics.crash({ message: 'Test crash from Cycle Charm' });
  } catch (error) {
    console.error('Error triggering test crash:', error);
  }
};
