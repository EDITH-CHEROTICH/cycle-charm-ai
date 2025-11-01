import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PremiumBadge = () => {
  return (
    <Badge className="bg-gradient-to-r from-primary to-accent">
      <Crown className="w-3 h-3 mr-1" />
      Premium
    </Badge>
  );
};
