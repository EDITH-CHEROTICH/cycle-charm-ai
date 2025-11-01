import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

export const PREMIUM_ENTITLEMENT = 'premium';

export const initializeRevenueCat = async () => {
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    // Configure with your RevenueCat API keys
    // You'll need to add these as secrets: REVENUECAT_ANDROID_KEY and REVENUECAT_IOS_KEY
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
    
    if (!apiKey) {
      console.warn('RevenueCat API key not configured');
      return false;
    }

    await Purchases.configure({
      apiKey,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    return false;
  }
};

export const checkPremiumStatus = async (): Promise<boolean> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return false;
  }
};

export const getOfferings = async () => {
  try {
    const result = await Purchases.getOfferings();
    return result;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
};

export const purchasePackage = async (packageIdentifier: string) => {
  try {
    const result = await Purchases.getOfferings();
    const currentOffering = result.current;
    
    if (!currentOffering) {
      throw new Error('No current offering available');
    }

    const packageToPurchase = currentOffering.availablePackages.find(
      (pkg: any) => pkg.identifier === packageIdentifier
    );

    if (!packageToPurchase) {
      throw new Error('Package not found');
    }

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: packageToPurchase,
    });

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
