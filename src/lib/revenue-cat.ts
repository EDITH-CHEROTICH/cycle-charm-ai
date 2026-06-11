import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export const PREMIUM_ENTITLEMENT = 'premium';

const isNativePlatform = () => Capacitor.isNativePlatform();

let configured = false;

const getApiKey = (): string | undefined => {
  const platform = Capacitor.getPlatform();
  const ios = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
  const android = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;
  const fallback = import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined;

  if (platform === 'ios') return ios || fallback;
  if (platform === 'android') return android || fallback;
  return fallback;
};

export const initializeRevenueCat = async () => {
  if (!isNativePlatform()) {
    console.log('RevenueCat: Skipping initialization on web');
    return false;
  }

  if (configured) return true;

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn('RevenueCat API key not configured for platform', Capacitor.getPlatform());
      return false;
    }

    await Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    return false;
  }
};

export const identifyRevenueCatUser = async (userId: string) => {
  if (!isNativePlatform() || !userId) return;
  try {
    if (!configured) await initializeRevenueCat();
    await Purchases.logIn({ appUserID: userId });
  } catch (error) {
    console.error('RevenueCat logIn failed:', error);
  }
};

export const logoutRevenueCatUser = async () => {
  if (!isNativePlatform()) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('RevenueCat logOut failed:', error);
  }
};

export const addPremiumListener = (cb: (isPremium: boolean) => void) => {
  if (!isNativePlatform()) return () => {};
  try {
    const handle = Purchases.addCustomerInfoUpdateListener((info: any) => {
      const active = info?.entitlements?.active?.[PREMIUM_ENTITLEMENT] !== undefined;
      cb(active);
    });
    return () => {
      try {
        // SDK returns a removable subscription on some versions
        (handle as any)?.remove?.();
      } catch {}
    };
  } catch (error) {
    console.error('Failed to attach RevenueCat listener:', error);
    return () => {};
  }
};

export const checkPremiumStatus = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return false;
  }
};

export const getOfferings = async () => {
  if (!isNativePlatform()) return null;
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
};

export const purchasePackage = async (packageIdentifier: string) => {
  if (!isNativePlatform()) return { success: false, isPremium: false };

  try {
    const result = await Purchases.getOfferings();
    const currentOffering = result.current;
    if (!currentOffering) throw new Error('No current offering available');

    const packageToPurchase = currentOffering.availablePackages.find(
      (pkg: any) => pkg.identifier === packageIdentifier
    );
    if (!packageToPurchase) throw new Error('Package not found');

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
    return {
      success: true,
      isPremium: customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined,
    };
  } catch (error) {
    console.error('Purchase failed:', error);
    return { success: false, isPremium: false };
  }
};

export const restorePurchases = async () => {
  if (!isNativePlatform()) return { success: false, isPremium: false };
  try {
    const customerInfo = await Purchases.restorePurchases();
    return {
      success: true,
      isPremium: customerInfo.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined,
    };
  } catch (error) {
    console.error('Restore failed:', error);
    return { success: false, isPremium: false };
  }
};

export const openManageSubscription = async () => {
  const platform = Capacitor.getPlatform();
  const url =
    platform === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  window.open(url, '_blank');
};
