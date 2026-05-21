import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import {
  Calendar,
  MessageCircle,
  Sparkles,
  TrendingUp,
  WifiOff,
  Bell,
  Heart,
  ChevronRight,
  Flower2,
} from "lucide-react";
import { updateCycleReminders } from "@/lib/notifications";
import { setUserId, logBreadcrumb } from "@/lib/crashlytics";
import { showBannerAd, hideBannerAd, prepareInterstitialAd } from "@/lib/admob";
import { usePremium } from "@/hooks/use-premium";
import {
  useOffline,
  cacheUserData,
  cacheUserSession,
  getCachedProfile,
  getCachedCycleData,
  getCachedPeriodLogs,
  getCachedSymptoms,
  hasCachedUserData,
} from "@/hooks/use-offline";

import avatarFollicular from "@/assets/avatar-follicular.png";
import avatarPeriod from "@/assets/avatar-period.png";
import avatarOvulation from "@/assets/avatar-ovulation.png";
import avatarLuteal from "@/assets/avatar-luteal.png";
import avatarDelayed from "@/assets/avatar-delayed.png";
import sleepingKitten from "@/assets/sleeping-kitten.png";
import moonCloud from "@/assets/moon-cloud.png";

type PhaseKey = "period" | "follicular" | "ovulation" | "luteal" | "delayed";

const PHASE_META: Record<
  PhaseKey,
  {
    label: string;
    avatar: string;
    bubble: string;
    description: string;
    tagEmoji: string;
    dayLabel: (day: number, total: number) => string;
    tip: string;
    reminder: string;
  }
> = {
  period: {
    label: "Period",
    avatar: avatarPeriod,
    bubble: "Rest is productive too, darling 💕",
    description: "Take it easy, babe. Your body is doing magical work.",
    tagEmoji: "🩸",
    dayLabel: (d, t) => `Day ${d} of your period 🩸`,
    tip: "Stay hydrated and rest when you need to. Heat pads help with cramps! 💜",
    reminder:
      "Sweet girl, today is a soft day. Wrap up warm, sip something cozy, and let the world wait. You're allowed to slow down.",
  },
  follicular: {
    label: "Follicular Phase",
    avatar: avatarFollicular,
    bubble: "Be kind to your body, it's your home for life! 💕",
    description: "Energy rising! Great time for new beginnings.",
    tagEmoji: "🌸",
    dayLabel: (d, t) => `Day ${d} of ${t} 🌱`,
    tip: "Your energy is building — perfect time for workouts and fresh starts! 🌱",
    reminder:
      "You're blooming, beautiful. Start that little thing you've been thinking about — your spark is real today.",
  },
  ovulation: {
    label: "Ovulation",
    avatar: avatarOvulation,
    bubble: "You're absolutely glowing today, queen! ✨",
    description: "Peak energy & confidence! You're radiant, darling.",
    tagEmoji: "✨",
    dayLabel: (d, _t) => `Day ${d} of ovulation ✨`,
    tip: "You're at peak charisma — say yes to that social plan! ✨",
    reminder:
      "Look at you shining, gorgeous. Wear the outfit, send the message, take up space. The world is lucky to have you today.",
  },
  luteal: {
    label: "Luteal Phase",
    avatar: avatarLuteal,
    bubble: "Cozy vibes only — be gentle with you 🌙",
    description: "Time for self-care and soft, cozy moments.",
    tagEmoji: "🌙",
    dayLabel: (d, t) => `Day ${d} of ${t} 🌙`,
    tip: "Craving chocolate? That's normal! Be extra gentle with yourself. 🌙",
    reminder:
      "Hey love, feelings might be louder today and that's okay. Light a candle, soft blanket, favorite snack — you're so deserving.",
  },
  delayed: {
    label: "Period Delayed",
    avatar: avatarDelayed,
    bubble: "Eek! Where is she?! 😨💗",
    description: "Your period seems to be running late, babe. Don't panic — bodies are mysterious!",
    tagEmoji: "⏰",
    dayLabel: (d, _t) => (d === 1 ? `1 day late 😳` : `${d} days late 😳`),
    tip: "Late periods happen — stress, sleep, travel, all of it counts. Breathe, hydrate, and be kind to yourself 💕",
    reminder:
      "Hey love, your period is taking its sweet time. That's okay — it doesn't always run on schedule. If it's been a while or you're worried, I'm here, and so is your doctor. You're not alone 🤍",
  },
};

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phaseKey, setPhaseKey] = useState<PhaseKey>("follicular");
  const [cycleDay, setCycleDay] = useState(1);
  const [dayInPhase, setDayInPhase] = useState(1);
  const [phaseLength, setPhaseLength] = useState(1);
  const [daysUntilNext, setDaysUntilNext] = useState(0);
  const [nextPeriodDate, setNextPeriodDate] = useState<Date | null>(null);
  const [isInFertileWindow, setIsInFertileWindow] = useState(false);
  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);
  const [isDelayed, setIsDelayed] = useState(false);
  const [delayDays, setDelayDays] = useState(0);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [confirmingPeriod, setConfirmingPeriod] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOnline, isInitialized } = useOffline();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!isPremium) {
      showBannerAd();
      prepareInterstitialAd();
    }
    return () => {
      hideBannerAd();
    };
  }, [isPremium]);

  const toUtcMidnight = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d + "T00:00:00Z") : d;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  };
  const daysBetween = (a: string | Date, b: string | Date) => {
    const da = toUtcMidnight(a);
    const db = toUtcMidnight(b);
    return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
  };

  const loadOfflineData = () => {
    const cachedProfile = getCachedProfile();
    const cachedCycleData = getCachedCycleData();
    const cachedSymptoms = getCachedSymptoms();

    if (cachedProfile && cachedCycleData) {
      setProfile(cachedProfile);
      const today = new Date().toISOString().split("T")[0];
      const todaySymptomsFiltered = cachedSymptoms
        .filter((s: any) => s.log_date === today)
        .map((s: any) => s.symptom_name);
      setTodaySymptoms(todaySymptomsFiltered);

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
      return true;
    }
    return false;
  };

  const fetchData = async () => {
    if (!isOnline) {
      if (hasCachedUserData()) {
        loadOfflineData();
        return;
      } else {
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
      if (hasCachedUserData()) {
        loadOfflineData();
        return;
      }
      navigate("/auth");
      return;
    }

    cacheUserSession(session.user);

    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(profileData);

      const { data: cycleInfo } = await supabase
        .from("cycle_data")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!cycleInfo) {
        navigate("/onboarding");
        return;
      }

      const { data: logs } = await supabase
        .from("period_logs")
        .select("start_date")
        .eq("user_id", session.user.id)
        .order("start_date", { ascending: false })
        .limit(6);

      const today = new Date().toISOString().split("T")[0];
      const { data: symptoms } = await supabase
        .from("symptoms")
        .select("symptom_name")
        .eq("user_id", session.user.id)
        .eq("log_date", today);

      setTodaySymptoms(symptoms?.map((s) => s.symptom_name) || []);

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

      await cacheUserData(session.user.id);

      const nextStart = new Date(new Date(lastStart).getTime() + averageCycle * 86400000);
      updateCycleReminders(nextStart, averageCycle);

      setUserId(session.user.id);
      logBreadcrumb("Dashboard loaded successfully");
    } catch (error: any) {
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
    if (isInitialized) fetchData();
  }, [isInitialized, isOnline]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && isOnline && !hasCachedUserData()) navigate("/auth");
    });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate, isOnline]);

  const calculateCyclePhase = (data: any) => {
    const lastPeriod = toUtcMidnight(data.last_period_date);
    const today = toUtcMidnight(new Date());
    const totalCycle = data.average_cycle_length || 28;
    const periodLength = data.average_period_length || 5;

    const daysSinceLastPeriod = Math.max(
      0,
      Math.round((today.getTime() - lastPeriod.getTime()) / 86400000),
    );

    const nextStart = new Date(lastPeriod.getTime() + totalCycle * 86400000);
    setNextPeriodDate(nextStart);

    // DELAYED: today is past the expected next period start and no new period logged
    if (daysSinceLastPeriod >= totalCycle) {
      const late = daysSinceLastPeriod - totalCycle + 1;
      setIsDelayed(true);
      setDelayDays(late);
      setPhaseKey("delayed");
      setDayInPhase(late);
      setPhaseLength(late);
      setCycleDay(totalCycle);
      setDaysUntilNext(0);
      setIsInFertileWindow(false);

      // Check if user already said "not yet" today
      const dismissedKey = `period-delay-dismissed-${today.toISOString().split("T")[0]}`;
      setPromptDismissed(localStorage.getItem(dismissedKey) === "1");
      return;
    }

    setIsDelayed(false);
    setDelayDays(0);

    const day = daysSinceLastPeriod + 1; // 1-indexed within current cycle
    setCycleDay(day);

    const ovulationDay = totalCycle - 14; // typical
    const ovulationStart = ovulationDay - 1;
    const ovulationEnd = ovulationDay + 1;

    let key: PhaseKey;
    let dayIn = 1;
    let len = 1;

    if (day <= periodLength) {
      key = "period";
      dayIn = day;
      len = periodLength;
    } else if (day < ovulationStart) {
      key = "follicular";
      dayIn = day - periodLength;
      len = ovulationStart - periodLength;
    } else if (day <= ovulationEnd) {
      key = "ovulation";
      dayIn = day - ovulationStart + 1;
      len = ovulationEnd - ovulationStart + 1;
    } else {
      key = "luteal";
      dayIn = day - ovulationEnd;
      len = totalCycle - ovulationEnd;
    }

    setPhaseKey(key);
    setDayInPhase(Math.max(1, dayIn));
    setPhaseLength(Math.max(1, len));

    const nextDays = Math.max(
      0,
      Math.round((nextStart.getTime() - today.getTime()) / 86400000),
    );
    setDaysUntilNext(nextDays);

    const inFertile = day >= ovulationDay - 4 && day <= ovulationDay + 1;
    setIsInFertileWindow(inFertile);
  };

  const handlePeriodStarted = async () => {
    setConfirmingPeriod(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await supabase.from("period_logs").insert({
        user_id: user.id,
        start_date: todayStr,
        flow_intensity: "medium",
      });
      await supabase
        .from("cycle_data")
        .update({ last_period_date: todayStr, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      toast({ title: "Period logged 💕", description: "Welcome to day 1, beautiful." });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setConfirmingPeriod(false);
    }
  };

  const handleNotYet = () => {
    const today = toUtcMidnight(new Date()).toISOString().split("T")[0];
    localStorage.setItem(`period-delay-dismissed-${today}`, "1");
    setPromptDismissed(true);
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

  const meta = PHASE_META[phaseKey];
  const cycleProgress = cycleData ? Math.min(100, (cycleDay / cycleData.average_cycle_length) * 100) : 0;

  // Build a daily note based on logged feelings (symptoms)
  const buildDailyNote = () => {
    const low = todaySymptoms.map((s) => s.toLowerCase());
    if (low.some((s) => s.includes("cramp") || s.includes("pain"))) {
      return "I see you, brave girl 💕 grab a heat pad, a snack and breathe slow — this will pass.";
    }
    if (low.some((s) => s.includes("sad") || s.includes("anx") || s.includes("low") || s.includes("mood"))) {
      return "Soft reminder: your feelings are valid, darling. Be your own best friend today 🤍";
    }
    if (low.some((s) => s.includes("tired") || s.includes("fatigue") || s.includes("sleep"))) {
      return "Rest is not laziness, beautiful. Permission granted to nap and recharge 🌙";
    }
    if (low.some((s) => s.includes("happy") || s.includes("energ") || s.includes("good"))) {
      return "Look at you radiating! Ride that wave today, queen ✨";
    }
    return meta.reminder;
  };

  const dailyNote = buildDailyNote();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(330_60%_96%)] via-background to-[hsl(310_45%_94%)] pb-24">
      {!isOnline && (
        <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          You're offline - using cached data
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center border border-border/50">
            <span className="text-primary text-lg">≡</span>
          </button>
          <button
            onClick={() => navigate("/calendar")}
            className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center border border-border/50 relative"
            aria-label="Reminders"
          >
            <Bell className="w-5 h-5 text-primary" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
          </button>
        </div>

        {/* Greeting + avatar + speech bubble */}
        <div className="relative mb-3">
          <div className="pr-32">
            <h1 className="text-4xl font-bold text-primary leading-tight flex items-center gap-2">
              Hey {profile?.display_name || "beautiful"}!
              <Heart className="w-6 h-6 fill-accent text-accent" />
            </h1>
            <p className="text-muted-foreground mt-1">
              You've got this, beautiful! <span className="text-accent">✨</span>
            </p>
          </div>
          <div className="absolute -top-2 right-0 w-32 h-32">
            <img
              src={meta.avatar}
              alt={`${meta.label} avatar`}
              className="w-full h-full object-contain drop-shadow-md"
              width={768}
              height={768}
            />
          </div>
        </div>

        {/* Speech bubble */}
        <div className="flex justify-end mb-4 -mt-4">
          <div className="relative bg-card rounded-2xl rounded-br-sm px-4 py-2 shadow-sm border border-border/50 max-w-[200px]">
            <p className="text-xs text-foreground/80 leading-snug">{meta.bubble}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Main phase card */}
          <Card className="p-6 bg-gradient-to-br from-[hsl(310_55%_92%)] to-[hsl(330_60%_90%)] border-primary/20 overflow-hidden relative">
            <div className="absolute top-3 left-3 text-2xl opacity-60">🌸</div>
            <div className="absolute top-3 right-3 text-2xl opacity-60">🦋</div>
            <div className="absolute bottom-3 left-3 text-xl opacity-50">🌷</div>
            <div className="absolute bottom-3 right-3 text-xl opacity-50">💜</div>

            <div className="text-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-1 rounded-full text-xs font-semibold tracking-wider text-primary mb-3">
                CURRENT PHASE <span>{meta.tagEmoji}</span>
              </div>
              <h2 className="text-3xl font-bold text-primary mb-2">{meta.label}</h2>
              <p className="text-sm text-foreground/70 mb-4 px-4">{meta.description}</p>

              <Progress value={cycleProgress} className="h-2 mb-3" />

              <div className="inline-flex items-center gap-2 bg-card/90 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium text-primary shadow-sm">
                <Sparkles className="w-3 h-3" />
                {meta.dayLabel(dayInPhase, phaseLength)}
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border-primary/20 bg-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-accent leading-none">{daysUntilNext}</p>
                  <p className="text-xs text-muted-foreground mt-1">Days until period</p>
                </div>
              </div>
              <div className="mt-3 flex gap-1 text-accent/40">
                <Heart className="w-3 h-3 fill-current" />
                <Heart className="w-3 h-3 fill-current" />
                <Heart className="w-3 h-3 fill-current" />
                <Heart className="w-3 h-3 fill-current" />
              </div>
            </Card>

            <Card className="p-4 border-primary/20 bg-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Flower2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary leading-none">
                    {cycleData?.average_cycle_length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Avg cycle length</p>
                </div>
              </div>
              <svg viewBox="0 0 100 20" className="mt-3 w-full h-4 text-primary/60">
                <path
                  d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <circle cx="90" cy="10" r="2" fill="currentColor" />
              </svg>
            </Card>
          </div>

          {/* Fertile window */}
          {isInFertileWindow && (
            <Card className="p-4 bg-gradient-to-r from-[hsl(340_75%_90%)] to-[hsl(330_70%_88%)] border-accent/30">
              <div className="flex items-center gap-3">
                <div className="text-3xl">💖</div>
                <div className="flex-1">
                  <p className="font-bold text-accent">Fertile Window</p>
                  <p className="text-xs text-foreground/70">You're in your most fertile days!</p>
                </div>
                <ChevronRight className="w-5 h-5 text-accent" />
              </div>
            </Card>
          )}

          {/* Next period */}
          <Card className="p-4 border-primary/20 bg-card">
            <div className="flex items-center gap-3">
              <img
                src={moonCloud}
                alt="Moon"
                className="w-12 h-12 object-contain flex-shrink-0"
                width={512}
                height={512}
                loading="lazy"
              />
              <div className="flex-1">
                <p className="font-bold text-primary">Next Period</p>
                <p className="text-sm text-muted-foreground">
                  {nextPeriodDate ? format(nextPeriodDate, "MMMM d, yyyy") : "Calculating..."}
                </p>
              </div>
              <Badge variant="outline" className="border-accent text-accent rounded-full">
                In {daysUntilNext} days
              </Badge>
            </div>
          </Card>

          {/* Quick actions: 4 tiles */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate("/calendar")}
              className="bg-card border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center gap-1 hover:bg-primary/5 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Track & Log</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Symptoms, mood & more</p>
              <ChevronRight className="w-3 h-3 text-accent mt-1" />
            </button>
            <button
              onClick={() => navigate("/calendar")}
              className="bg-card border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center gap-1 hover:bg-primary/5 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Insights</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Patterns & trends</p>
              <ChevronRight className="w-3 h-3 text-primary mt-1" />
            </button>
            <button
              onClick={() => navigate("/chat")}
              className="bg-card border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center gap-1 hover:bg-primary/5 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Chat with me</p>
              <p className="text-[10px] text-muted-foreground leading-tight">I'm here, always</p>
              <ChevronRight className="w-3 h-3 text-accent mt-1" />
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="bg-card border border-primary/20 rounded-2xl p-3 flex flex-col items-center text-center gap-1 hover:bg-primary/5 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Reminders</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Never miss a day</p>
              <ChevronRight className="w-3 h-3 text-primary mt-1" />
            </button>
          </div>

          {/* Today's symptoms */}
          {todaySymptoms.length > 0 && (
            <Card className="p-4 border-primary/20 bg-card">
              <p className="text-sm font-medium mb-2 text-primary">Today's Symptoms 💕</p>
              <div className="flex flex-wrap gap-2">
                {todaySymptoms.map((symptom) => (
                  <Badge key={symptom} variant="secondary" className="text-xs">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Daily note (Reminders area) */}
          <Card className="p-4 bg-gradient-to-r from-[hsl(295_50%_92%)] to-[hsl(310_55%_90%)] border-primary/20 overflow-hidden">
            <div className="flex items-center gap-3">
              <img
                src={sleepingKitten}
                alt="A note from your companion"
                className="w-16 h-16 object-contain flex-shrink-0"
                width={768}
                height={512}
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary mb-1 flex items-center gap-1">
                  A note for you <Sparkles className="w-3.5 h-3.5 text-accent" />
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed">{dailyNote}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
            </div>
          </Card>

          {/* Daily tip */}
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">Daily Tip</p>
                <p className="text-sm text-muted-foreground">{meta.tip}</p>
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
