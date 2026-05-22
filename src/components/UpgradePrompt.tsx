import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  title?: string;
  message?: string;
  compact?: boolean;
}

export const UpgradePrompt = ({
  title = "You've reached your free limit, babe 💜",
  message = "Upgrade to Premium for unlimited access and more features.",
  compact = false,
}: UpgradePromptProps) => {
  const navigate = useNavigate();
  return (
    <Card className={`${compact ? "p-3" : "p-4"} bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30`}>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-gradient-to-r from-primary to-accent p-2">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {!compact && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/subscription")}
          className="bg-gradient-to-r from-primary to-accent shrink-0"
        >
          Upgrade
        </Button>
      </div>
    </Card>
  );
};
