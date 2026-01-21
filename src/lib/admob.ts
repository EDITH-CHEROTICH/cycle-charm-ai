import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export const AD_UNIT_IDS = {
  banner: 'ca-app-pub-3754288140610840/7115474238',
  interstitial: 'ca-app-pub-3754288140610840/5802392566',
  reward: 'ca-app-pub-3754288140610840/4283644373',
};

const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const initializeAdMob = async () => {
  if (!isNativePlatform()) {
    console.log('AdMob: Skipping initialization on web');
    return;
  }
  
  try {
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: false,
    });
    console.log('AdMob initialized');
  } catch (error) {
    console.error('AdMob initialization error:', error);
  }
};

export const showBannerAd = async () => {
  if (!isNativePlatform()) return;
  
  try {
    const options: BannerAdOptions = {
      adId: AD_UNIT_IDS.banner,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    };
    await AdMob.showBanner(options);
  } catch (error) {
    console.error('Banner ad error:', error);
  }
};

export const hideBannerAd = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error('Hide banner error:', error);
  }
};

export const prepareInterstitialAd = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await AdMob.prepareInterstitial({
      adId: AD_UNIT_IDS.interstitial,
    });
  } catch (error) {
    console.error('Prepare interstitial error:', error);
  }
};

export const showInterstitialAd = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await AdMob.showInterstitial();
  } catch (error) {
    console.error('Show interstitial error:', error);
  }
};

export const prepareRewardAd = async () => {
  if (!isNativePlatform()) return;
  
  try {
    await AdMob.prepareRewardVideoAd({
      adId: AD_UNIT_IDS.reward,
    });
  } catch (error) {
    console.error('Prepare reward ad error:', error);
  }
};

export const showRewardAd = async (): Promise<AdMobRewardItem | null> => {
  if (!isNativePlatform()) return null;
  
  try {
    const result = await AdMob.showRewardVideoAd();
    return result;
  } catch (error) {
    console.error('Show reward ad error:', error);
    return null;
  }
};
