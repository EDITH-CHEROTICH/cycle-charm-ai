import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { usePremium } from "@/hooks/use-premium";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Baby, Lock, Heart, ArrowLeft } from "lucide-react";
import { addDays, differenceInDays, differenceInWeeks, format } from "date-fns";

const STORAGE_KEY = "pregnancy:lmp";

const MILESTONES: Record<number, string> = {
  4: "Tiny embryo, the size of a poppy seed 🌱",
  8: "Baby's heart is beating — size of a raspberry 🫐",
  12: "End of first trimester! Size of a lime 🍋",
  16: "Baby can hear you now, size of an avocado 🥑",
  20: "Halfway there! Size of a banana 🍌",
  24: "Baby can recognize your voice — size of an ear of corn 🌽",
  28: "Third trimester begins! Size of an eggplant 🍆",
  32: "Baby is practicing breathing — size of a squash 🎃",
  36: "Almost full term, size of a romaine lettuce 🥬",
  40: "Due date! Baby is ready to meet you 👶💜",
};

const PREVIEW_KEY = "pregnancy:preview";

const Pregnancy = () => {
  const { isPremium, loading: premiumLoading } = usePremium();
  const navigate = useNavigate();
  const [lmp, setLmp] = useState<string>("");
  const [savedLmp, setSavedLmp] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(PREVIEW_KEY) === "1"
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSavedLmp(stored);
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/auth");
    });
  }, [navigate]);

  const enablePreview = () => {
    localStorage.setItem(PREVIEW_KEY, "1");
    setPreviewMode(true);
  };

  const disablePreview = () => {
    localStorage.removeItem(PREVIEW_KEY);
    setPreviewMode(false);
  };


  const handleSave = () => {
    if (!lmp) return;
    localStorage.setItem(STORAGE_KEY, lmp);
    setSavedLmp(lmp);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedLmp(null);
    setLmp("");
  };

  if (premiumLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <Baby className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pregnancy Mode
          </h1>
        </div>

        {!isPremium ? (
          <Card className="p-6 border-primary/20 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Premium Feature 💜</h3>
            <p className="text-muted-foreground mb-4">
              Track your pregnancy week-by-week with due date, milestones, and a personalized journey.
            </p>
            <UpgradePrompt compact />
          </Card>
        ) : !savedLmp ? (
          <Card className="p-6 border-primary/20">
            <h3 className="font-semibold mb-2">Let's set up your journey 🌸</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the first day of your last menstrual period (LMP) to estimate your due date.
            </p>
            <Label htmlFor="lmp">First day of last period</Label>
            <Input
              id="lmp"
              type="date"
              value={lmp}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setLmp(e.target.value)}
              className="mt-2 mb-4"
            />
            <Button
              onClick={handleSave}
              disabled={!lmp}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              Start Pregnancy Journey
            </Button>
          </Card>
        ) : (
          (() => {
            const lmpDate = new Date(savedLmp);
            const dueDate = addDays(lmpDate, 280);
            const today = new Date();
            const daysIn = Math.max(0, differenceInDays(today, lmpDate));
            const weeks = Math.min(40, Math.floor(daysIn / 7));
            const daysInWeek = daysIn % 7;
            const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;
            const daysToGo = Math.max(0, differenceInDays(dueDate, today));
            const progress = Math.min(100, (daysIn / 280) * 100);
            const milestoneWeek = Object.keys(MILESTONES)
              .map(Number)
              .filter((w) => w <= weeks)
              .pop();
            const milestone = milestoneWeek ? MILESTONES[milestoneWeek] : "Your journey is just beginning 🌸";

            return (
              <div className="space-y-4">
                <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">You are</p>
                    <p className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent my-2">
                      {weeks}w {daysInWeek}d
                    </p>
                    <p className="text-sm text-muted-foreground">pregnant · Trimester {trimester}</p>
                  </div>
                  <Progress value={progress} className="mt-4" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Week 0</span>
                    <span>Week 40</span>
                  </div>
                </Card>

                <Card className="p-4 border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold">This week</h4>
                  </div>
                  <p className="text-sm">{milestone}</p>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 text-center border-primary/20">
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-lg font-bold text-primary">{format(dueDate, "MMM d, yyyy")}</p>
                  </Card>
                  <Card className="p-4 text-center border-primary/20">
                    <p className="text-xs text-muted-foreground">Days to go</p>
                    <p className="text-lg font-bold text-primary">{daysToGo}</p>
                  </Card>
                </div>

                <Button variant="outline" onClick={handleReset} className="w-full">
                  Reset Pregnancy Tracking
                </Button>
              </div>
            );
          })()
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Pregnancy;
