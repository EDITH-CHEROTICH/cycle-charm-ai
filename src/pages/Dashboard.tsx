import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("");
  const [daysUntilNext, setDaysUntilNext] = useState(0);
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
          .single();

        setProfile(profileData);

        // Fetch cycle data
        const { data: cycleInfo } = await supabase
          .from("cycle_data")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (!cycleInfo) {
          navigate("/onboarding");
          return;
        }

        setCycleData(cycleInfo);
        calculateCyclePhase(cycleInfo);
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

  const calculateCyclePhase = (data: any) => {
    const lastPeriod = new Date(data.last_period_date);
    const today = new Date();
    const daysSinceLastPeriod = Math.floor(
      (today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)
    );

    const cycleDay = daysSinceLastPeriod % data.average_cycle_length;

    if (cycleDay <= data.average_period_length) {
      setCurrentPhase("Period");
    } else if (cycleDay <= 14) {
      setCurrentPhase("Follicular Phase");
    } else if (cycleDay <= 16) {
      setCurrentPhase("Ovulation");
    } else {
      setCurrentPhase("Luteal Phase");
    }

    const nextPeriodDays = data.average_cycle_length - cycleDay;
    setDaysUntilNext(nextPeriodDays > 0 ? nextPeriodDays : 0);
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
