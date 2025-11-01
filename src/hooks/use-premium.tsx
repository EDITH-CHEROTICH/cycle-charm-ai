import { useState, useEffect } from 'react';
import { checkPremiumStatus, initializeRevenueCat } from '@/lib/revenue-cat';

export const usePremium = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const initialized = await initializeRevenueCat();
      if (initialized) {
        const status = await checkPremiumStatus();
        setIsPremium(status);
      }
      setLoading(false);
    };

    init();
  }, []);

  const refreshStatus = async () => {
    const status = await checkPremiumStatus();
    setIsPremium(status);
  };

  return { isPremium, loading, refreshStatus };
};
