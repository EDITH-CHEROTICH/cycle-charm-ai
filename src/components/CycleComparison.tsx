import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { differenceInDays, format } from "date-fns";
import { usePremium } from "@/hooks/use-premium";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Lock, GitCompare } from "lucide-react";

interface CycleRow {
  startDate: string;
  cycleLength: number;
  periodLength: number;
}

export const CycleComparison = () => {
  const { isPremium, loading: premiumLoading } = usePremium();
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: periods } = await supabase
        .from("period_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: true });

      if (periods && periods.length > 1) {
        const rows: CycleRow[] = [];
        for (let i = 1; i < periods.length; i++) {
          const prev = new Date(periods[i - 1].start_date);
          const curr = new Date(periods[i].start_date);
          const cycleLength = differenceInDays(curr, prev);
          if (cycleLength > 15 && cycleLength < 60) {
            const periodLength = periods[i].end_date
              ? differenceInDays(new Date(periods[i].end_date), curr) + 1
              : 5;
            rows.push({
              startDate: periods[i].start_date,
              cycleLength,
              periodLength,
            });
          }
        }
        setCycles(rows.slice(-3));
      }
      setLoading(false);
    };
    load();
  }, [isPremium]);

  if (premiumLoading || loading) {
    return <Card className="p-6 border-primary/20 text-center text-muted-foreground">Loading...</Card>;
  }

  if (!isPremium) {
    return (
      <Card className="p-6 border-primary/20 text-center">
        <Lock className="w-10 h-10 mx-auto mb-3 text-primary" />
        <h4 className="font-semibold mb-2">Cycle Comparison</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Compare your last 3 cycles side-by-side and spot trends instantly.
        </p>
        <UpgradePrompt compact title="Premium feature 💜" />
      </Card>
    );
  }

  const avg = cycles.length
    ? Math.round(cycles.reduce((s, c) => s + c.cycleLength, 0) / cycles.length)
    : 0;

  return (
    <Card className="p-4 border-primary/20">
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-primary" /> Last 3 Cycles
      </h4>
      {cycles.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">
          Log a few more periods to compare cycles, darling 💜
        </p>
      ) : (
        <div className="space-y-3">
          {cycles.map((c, i) => {
            const diff = c.cycleLength - avg;
            return (
              <div key={c.startDate} className="rounded-lg border border-primary/20 p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">
                    Cycle #{i + 1} · {format(new Date(c.startDate), "MMM d, yyyy")}
                  </span>
                  <span className={`text-xs font-semibold ${diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                    {diff > 0 ? `+${diff}` : diff} vs avg
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Cycle length</p>
                    <p className="text-lg font-bold text-primary">{c.cycleLength} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Period length</p>
                    <p className="text-lg font-bold text-primary">{c.periodLength} days</p>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Average: {avg} days · Based on your last {cycles.length} cycles
          </p>
        </div>
      )}
    </Card>
  );
};
