import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("");
  const [daysUntilNext, setDaysUntilNext] = useState(0);
  const [nextPeriodDate, setNextPeriodDate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        setProfile(profileData);

        // Fetch cycle data
        const { data: cycleInfo } = await supabase
          .from("cycle_data")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!cycleInfo) {
          navigate("/onboarding");
          return;
        }

        // Fetch recent period logs to refine prediction
        const { data: logs } = await supabase
          .from("period_logs")
          .select("start_date")
          .eq("user_id", session.user.id)
          .order("start_date", { ascending: false })
          .limit(6);

        let lastStart = cycleInfo.last_period_date;
        let averageCycle = cycleInfo.average_cycle_length;

        if (logs && logs.length > 0) {
          lastStart = logs[0].start_date;
          if (logs.length > 1) {
            const gaps: number[] = [];
            for (let i = 0; i < logs.length - 1; i++) {
              const gap = daysBetween(logs[i].start_date, logs[i + 1].start_date);
              if (!isNaN(gap) && gap > 10 && gap < 60) gaps.push(gap);
            }
            if (gaps.length) {
              averageCycle = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
            }
          }
        }

        const refined = {
          ...cycleInfo,
          last_period_date: lastStart,
          average_cycle_length: averageCycle,
        };

        setCycleData(refined);
        calculateCyclePhase(refined);
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // UTC helpers to avoid timezone off-by-one errors
  const toUtcMidnight = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d + "T00:00:00Z") : d;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  };
  const daysBetween = (a: string | Date, b: string | Date) => {
    const da = toUtcMidnight(a);
    const db = toUtcMidnight(b);
    return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateCyclePhase = (data: any) => {
    const lastPeriod = toUtcMidnight(data.last_period_date);
    const today = toUtcMidnight(new Date());

    const daysSinceLastPeriod = Math.max(
      0,
      Math.round((today.getTime() - lastPeriod.getTime()) / 86400000)
    );

    const cycleDay = daysSinceLastPeriod % data.average_cycle_length;

    if (cycleDay < data.average_period_length) {
      setCurrentPhase("Period");
    } else if (cycleDay < 14) {
      setCurrentPhase("Follicular Phase");
    } else if (cycleDay <= 16) {
      setCurrentPhase("Ovulation");
    } else {
      setCurrentPhase("Luteal Phase");
    }

    const nextStart = new Date(
      lastPeriod.getTime() + data.average_cycle_length * 86400000
    );
    setNextPeriodDate(nextStart);
    const nextDays = Math.max(
      0,
      Math.round((nextStart.getTime() - today.getTime()) / 86400000) %
        data.average_cycle_length
    );
    setDaysUntilNext(nextDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-2">💜</div>
          <p className="text-muted-foreground">Loading, babe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Hey {profile?.display_name}! 💜
          </h1>
          <p className="text-muted-foreground">How are you feeling today, darling?</p>
        </div>

        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Current Phase</p>
              <h2 className="text-2xl font-bold text-primary mb-4">{currentPhase}</h2>
              <div className="flex justify-center items-center gap-2">
                <div className="text-4xl">🌸</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-primary/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Next Period In</p>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {daysUntilNext}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">days</p>
              <p className="text-xs text-muted-foreground mt-1">
                {nextPeriodDate ? `on ${format(nextPeriodDate, "PPP")}` : ""}
              </p>
            </div>
          </Card>

          <Card className="p-6 border-primary/20">
            <h3 className="font-semibold mb-3 text-lg">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Cycle:</span>
                <span className="font-medium">{cycleData?.average_cycle_length} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period Length:</span>
                <span className="font-medium">{cycleData?.average_period_length} days</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <p className="text-sm text-center text-muted-foreground">
              💡 <span className="font-medium">Tip:</span> Chat with me anytime you need support or have questions, babe!
            </p>
          </Card>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Dashboard;
