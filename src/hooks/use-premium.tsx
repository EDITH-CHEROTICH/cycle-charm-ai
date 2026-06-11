import { useState, useEffect } from 'react';
import {
  checkPremiumStatus,
  initializeRevenueCat,
  addPremiumListener,
  identifyRevenueCatUser,
} from '@/lib/revenue-cat';
import { supabase } from '@/integrations/supabase/client';

export const usePremium = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    let cancelled = false;

    const init = async () => {
      const initialized = await initializeRevenueCat();
      if (initialized) {
        const { data } = await supabase.auth.getUser();
        if (data.user?.id) {
          await identifyRevenueCatUser(data.user.id);
        }
        const status = await checkPremiumStatus();
        if (!cancelled) setIsPremium(status);

        removeListener = addPremiumListener((active) => {
          if (!cancelled) setIsPremium(active);
        });
      }
      if (!cancelled) setLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  const refreshStatus = async () => {
    const status = await checkPremiumStatus();
    setIsPremium(status);
  };

  return { isPremium, loading, refreshStatus };
};
