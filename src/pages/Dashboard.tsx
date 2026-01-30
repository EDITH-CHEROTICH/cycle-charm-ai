import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Calendar, MessageCircle, Sparkles, TrendingUp, WifiOff } from "lucide-react";
import { updateCycleReminders } from "@/lib/notifications";
import { setUserId, logBreadcrumb } from "@/lib/crashlytics";
import {
  useOffline,
  cacheUserData,
  cacheUserSession,
  getCachedUser,
  getCachedProfile,
  getCachedCycleData,
  getCachedPeriodLogs,
  getCachedSymptoms,
  hasCachedUserData,
} from "@/hooks/use-offline";

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState("");
  const [phaseEmoji, setPhaseEmoji] = useState("🌸");
  const [phaseDescription, setPhaseDescription] = useState("");
  const [daysUntilNext, setDaysUntilNext] = useState(0);
  const [nextPeriodDate, setNextPeriodDate] = useState<Date | null>(null);
  const [fertileWindow, setFertileWindow] = useState<{ start: Date; end: Date } | null>(null);
  const [isInFertileWindow, setIsInFertileWindow] = useState(false);
  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline, isInitialized } = useOffline();

  // Load cached data when offline
  const loadOfflineData = () => {
    const cachedProfile = getCachedProfile();
    const cachedCycleData = getCachedCycleData();
    const cachedSymptoms = getCachedSymptoms();

    if (cachedProfile && cachedCycleData) {
      setProfile(cachedProfile);
      
      // Get today's symptoms from cache
      const today = new Date().toISOString().split('T')[0];
      const todaySymptomsFiltered = cachedSymptoms
        .filter((s: any) => s.log_date === today)
        .map((s: any) => s.symptom_name);
      setTodaySymptoms(todaySymptomsFiltered);

      // Calculate cycle data from cached period logs
      const cachedLogs = getCachedPeriodLogs();
      let lastStart = cachedCycleData.last_period_date;
      let averageCycle = cachedCycleData.average_cycle_length;

      if (cachedLogs && cachedLogs.length > 0) {
        lastStart = cachedLogs[0].start_date;
        if (cachedLogs.length > 1) {
          const gaps: number[] = [];
          for (let i = 0; i < cachedLogs.length - 1; i++) {
            const gap = daysBetween(cachedLogs[i].start_date, cachedLogs[i + 1].start_date);
            if (!isNaN(gap) && gap > 10 && gap < 60) gaps.push(gap);
          }
          if (gaps.length) {
            averageCycle = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
          }
        }
      }

      const refined = {
        ...cachedCycleData,
        last_period_date: lastStart,
        average_cycle_length: averageCycle,
      };

      setCycleData(refined);
      calculateCyclePhase(refined);
      setLoading(false);
      
      toast({
        title: "Offline Mode",
        description: "Using cached data. Some features may be limited.",
      });
      return true;
    }
    return false;
  };

  const fetchData = async () => {
    // If offline, try to use cached data
    if (!isOnline) {
      if (hasCachedUserData()) {
        loadOfflineData();
        return;
      } else {
        // No cached data and offline - can't do anything
        toast({
          title: "You're offline",
          description: "Please connect to the internet to set up your account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Check for cached user data before redirecting to auth
      if (hasCachedUserData()) {
        loadOfflineData();
        return;
      }
      navigate("/auth");
      return;
    }

    // Cache user session for offline use
    cacheUserSession(session.user);

    try {
      setLoading(true);
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

      // Fetch today's symptoms
      const today = new Date().toISOString().split('T')[0];
      const { data: symptoms } = await supabase
        .from("symptoms")
        .select("symptom_name")
        .eq("user_id", session.user.id)
        .eq("log_date", today);

      setTodaySymptoms(symptoms?.map(s => s.symptom_name) || []);

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

      // Cache all user data for offline use
      await cacheUserData(session.user.id);

      // Schedule push notifications for cycle reminders
      const nextStart = new Date(new Date(lastStart).getTime() + averageCycle * 86400000);
      updateCycleReminders(nextStart, averageCycle);

      // Set user ID for crash reporting
      setUserId(session.user.id);
      logBreadcrumb('Dashboard loaded successfully');
    } catch (error: any) {
      // If fetch fails, try to use cached data
      if (hasCachedUserData()) {
        loadOfflineData();
        return;
      }
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      fetchData();
    }
  }, [isInitialized, isOnline]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session && isOnline && !hasCachedUserData()) {
          navigate("/auth");
        }
      }
    );

    // Refetch data when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, isOnline]);

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

    // Calculate phases with descriptions
    if (cycleDay < data.average_period_length) {
      setCurrentPhase("Period");
      setPhaseEmoji("🩸");
      setPhaseDescription("Take it easy, babe. Your body is working hard.");
    } else if (cycleDay < 14) {
      setCurrentPhase("Follicular Phase");
      setPhaseEmoji("🌱");
      setPhaseDescription("Energy rising! Great time for new projects.");
    } else if (cycleDay <= 16) {
      setCurrentPhase("Ovulation");
      setPhaseEmoji("✨");
      setPhaseDescription("Peak energy & confidence! You're glowing, darling.");
    } else {
      setCurrentPhase("Luteal Phase");
      setPhaseEmoji("🌙");
      setPhaseDescription("Time for self-care and cozy vibes.");
    }

    // Calculate next period
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

    // Calculate fertile window (5 days before ovulation + ovulation day)
    const ovulationDay = data.average_cycle_length - 14;
    const fertileStart = addDays(lastPeriod, ovulationDay - 5);
    const fertileEnd = addDays(lastPeriod, ovulationDay);
    setFertileWindow({ start: fertileStart, end: fertileEnd });
    
    const inFertile = cycleDay >= ovulationDay - 5 && cycleDay <= ovulationDay;
    setIsInFertileWindow(inFertile);
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
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          You're offline - using cached data
        </div>
      )}
      
      <div className="max-w-md mx-auto p-4 pt-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
            Hey {profile?.display_name}! 💜
          </h1>
          <p className="text-muted-foreground">How are you feeling today, darling?</p>
        </div>

        <div className="space-y-4">
          {/* Main Phase Card */}
          <Card className="p-6 bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30">
            <div className="text-center">
              <div className="text-5xl mb-3">{phaseEmoji}</div>
              <p className="text-sm text-muted-foreground mb-1">Current Phase</p>
              <h2 className="text-2xl font-bold text-primary mb-2">{currentPhase}</h2>
              <p className="text-sm text-muted-foreground">{phaseDescription}</p>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center border-primary/20">
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {daysUntilNext}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Days until period</p>
            </Card>
            <Card className="p-4 text-center border-primary/20">
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {cycleData?.average_cycle_length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg cycle length</p>
            </Card>
          </div>

          {/* Fertile Window Alert */}
          {isInFertileWindow && (
            <Card className="p-4 bg-gradient-to-r from-accent/20 to-primary/20 border-accent/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌟</span>
                <div>
                  <p className="font-medium text-accent-foreground">Fertile Window</p>
                  <p className="text-sm text-muted-foreground">You're in your most fertile days!</p>
                </div>
              </div>
            </Card>
          )}

          {/* Next Period */}
          <Card className="p-4 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Next Period</p>
                  <p className="text-sm text-muted-foreground">
                    {nextPeriodDate ? format(nextPeriodDate, "MMMM d, yyyy") : "Calculating..."}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-primary text-primary">
                {daysUntilNext} days
              </Badge>
            </div>
          </Card>

          {/* Today's Symptoms */}
          {todaySymptoms.length > 0 && (
            <Card className="p-4 border-primary/20">
              <p className="text-sm font-medium mb-2">Today's Symptoms</p>
              <div className="flex flex-wrap gap-2">
                {todaySymptoms.map((symptom) => (
                  <Badge key={symptom} variant="secondary" className="text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => navigate("/calendar")}
              variant="outline"
              className="h-auto py-4 flex-col gap-2 border-primary/20"
            >
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm">Track & Log</span>
            </Button>
            <Button
              onClick={() => navigate("/chat")}
              variant="outline"
              className="h-auto py-4 flex-col gap-2 border-primary/20"
            >
              <MessageCircle className="w-5 h-5 text-primary" />
              <span className="text-sm">Chat with me</span>
            </Button>
          </div>

          {/* Tip Card */}
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Daily Tip</p>
                <p className="text-sm text-muted-foreground">
                  {currentPhase === "Period" && "Stay hydrated and rest when you need to. Heat pads can help with cramps! 💜"}
                  {currentPhase === "Follicular Phase" && "Great time for exercise! Your energy is building up. 🌱"}
                  {currentPhase === "Ovulation" && "You might feel extra social - perfect time for important meetings! ✨"}
                  {currentPhase === "Luteal Phase" && "Craving chocolate? That's normal! Be gentle with yourself. 🌙"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Dashboard;
