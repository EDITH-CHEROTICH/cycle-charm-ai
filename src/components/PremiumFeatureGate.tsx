import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/use-premium";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PremiumFeatureGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const PremiumFeatureGate = ({ children, fallback }: PremiumFeatureGateProps) => {
  const { isPremium, loading } = usePremium();
  const navigate = useNavigate();

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!isPremium) {
    return (
      fallback || (
        <Card className="p-6 text-center border-primary/20">
          <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
          <p className="text-muted-foreground mb-4">
            Upgrade to premium to unlock this feature
          </p>
          <Button
            onClick={() => navigate("/subscription")}
            className="bg-gradient-to-r from-primary to-accent"
          >
            Upgrade Now
          </Button>
        </Card>
      )
    );
  }

  return <>{children}</>;
};
