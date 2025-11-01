import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/revenue-cat';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPaywallProps {
  onSubscribe?: () => void;
}

const premiumFeatures = [
  'Ad-free experience',
  'Advanced Analytics',
  'Unlimited Symptom Tracking',
  'Unlimited AI Insights',
  'Export Data',
  'Pregnancy Mode',
  'Partner Access',
  'Cycle Comparison',
];

export const SubscriptionPaywall = ({ onSubscribe }: SubscriptionPaywallProps) => {
  const [offerings, setOfferings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    const data = await getOfferings();
    setOfferings(data);
  };

  const handlePurchase = async (packageIdentifier: string) => {
    setLoading(true);
    try {
      const result = await purchasePackage(packageIdentifier);
      
      if (result.success && result.isPremium) {
        toast({
          title: 'Welcome to Premium!',
          description: 'You now have access to all premium features.',
        });
        onSubscribe?.();
      } else {
        toast({
          title: 'Purchase Failed',
          description: 'Please try again or contact support.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      
      if (result.success && result.isPremium) {
        toast({
          title: 'Purchases Restored',
          description: 'Your premium subscription has been restored.',
        });
        onSubscribe?.();
      } else {
        toast({
          title: 'No Purchases Found',
          description: 'No previous purchases were found to restore.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const currentOffering = offerings?.current;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Upgrade to Premium</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Unlock the full potential of Cycle Charm with premium features
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Basic cycle tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span>Basic cycle tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                <span>Smart reminders</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Limited AI insights</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">Includes ads</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary relative">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
            Most Popular
          </Badge>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Premium
              <Sparkles className="w-5 h-5" />
            </CardTitle>
            <CardDescription>Complete cycle wellness</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            {currentOffering?.availablePackages.map((pkg: any) => (
              <Button
                key={pkg.identifier}
                onClick={() => handlePurchase(pkg.identifier)}
                disabled={loading}
                className="w-full mb-2"
              >
                {loading ? 'Processing...' : `Subscribe - ${pkg.product.priceString}`}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button
          variant="ghost"
          onClick={handleRestore}
          disabled={loading}
        >
          Restore Purchases
        </Button>
      </div>
    </div>
  );
};
