import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Smile, Meh, Frown, Zap, Moon, Save, Droplet } from "lucide-react";

const MOODS = [
  { value: "great", icon: "😊", label: "Great" },
  { value: "good", icon: "🙂", label: "Good" },
  { value: "okay", icon: "😐", label: "Okay" },
  { value: "low", icon: "😔", label: "Low" },
  { value: "stressed", icon: "😰", label: "Stressed" },
];

const FLOW_LEVELS = [
  { value: "spotting", label: "Spotting", color: "bg-pink-200" },
  { value: "light", label: "Light", color: "bg-pink-300" },
  { value: "medium", label: "Medium", color: "bg-pink-400" },
  { value: "heavy", label: "Heavy", color: "bg-pink-500" },
];

const COMMON_SYMPTOMS = [
  "Cramps", "Bloating", "Headache", "Fatigue", "Mood Swings",
  "Breast Tenderness", "Acne", "Back Pain", "Nausea", "Food Cravings",
  "Insomnia", "Anxiety", "Irritability", "Dizziness"
];

interface DailyLoggerProps {
  selectedDate: Date;
  onLogSaved?: () => void;
}

export const DailyLogger = ({ selectedDate, onLogSaved }: DailyLoggerProps) => {
  const [mood, setMood] = useState<string>("");
  const [energy, setEnergy] = useState<number>(3);
  const [sleep, setSleep] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [flow, setFlow] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    loadDayData();
  }, [selectedDate]);

  const loadDayData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load daily log
      const { data: dailyLog } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", dateKey)
        .maybeSingle();

      if (dailyLog) {
        setMood(dailyLog.mood || "");
        setEnergy(dailyLog.energy_level || 3);
        setSleep(dailyLog.sleep_quality || 3);
        setNotes(dailyLog.notes || "");
      } else {
        setMood("");
        setEnergy(3);
        setSleep(3);
        setNotes("");
      }

      // Load symptoms for this date
      const { data: symptomData } = await supabase
        .from("symptoms")
        .select("symptom_name")
        .eq("user_id", user.id)
        .eq("log_date", dateKey);

      setSymptoms(symptomData?.map(s => s.symptom_name) || []);

      // Load period log for this date (for flow)
      const { data: periodLog } = await supabase
        .from("period_logs")
        .select("flow_intensity")
        .eq("user_id", user.id)
        .lte("start_date", dateKey)
        .or(`end_date.gte.${dateKey},end_date.is.null`)
        .maybeSingle();

      setFlow(periodLog?.flow_intensity || "");
    } catch (error) {
      console.error("Error loading day data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = async (symptom: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (symptoms.includes(symptom)) {
        await supabase
          .from("symptoms")
          .delete()
          .eq("user_id", user.id)
          .eq("symptom_name", symptom)
          .eq("log_date", dateKey);
        setSymptoms(symptoms.filter(s => s !== symptom));
      } else {
        await supabase
          .from("symptoms")
          .insert({
            user_id: user.id,
            symptom_name: symptom,
            log_date: dateKey
          });
        setSymptoms([...symptoms, symptom]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert daily log
      const { error } = await supabase
        .from("daily_logs")
        .upsert({
          user_id: user.id,
          log_date: dateKey,
          mood: mood || null,
          energy_level: energy,
          sleep_quality: sleep,
          notes: notes || null
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) throw error;

      toast({
        title: "Saved! 💜",
        description: `Your log for ${format(selectedDate, "MMM d")} has been saved`
      });

      onLogSaved?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 border-primary/20">
        <div className="text-center text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-primary/20 space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-lg">
          {format(selectedDate, "EEEE, MMMM d")}
        </h3>
        <p className="text-sm text-muted-foreground">How was your day, darling?</p>
      </div>

      {/* Mood Selection */}
      <div>
        <p className="text-sm font-medium mb-3">Mood</p>
        <div className="flex justify-center gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                mood === m.value
                  ? "bg-primary text-white scale-110"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <span className="text-2xl">{m.icon}</span>
              <span className="text-xs mt-1">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy Level */}
      <div>
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Energy Level
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setEnergy(level)}
              className={`w-10 h-10 rounded-full transition-all ${
                energy >= level
                  ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white"
                  : "bg-muted"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep Quality */}
      <div>
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Moon className="w-4 h-4" /> Sleep Quality
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setSleep(level)}
              className={`w-10 h-10 rounded-full transition-all ${
                sleep >= level
                  ? "bg-gradient-to-r from-indigo-400 to-purple-400 text-white"
                  : "bg-muted"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Flow Intensity (if applicable) */}
      {flow && (
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Droplet className="w-4 h-4" /> Flow
          </p>
          <div className="flex justify-center gap-2">
            {FLOW_LEVELS.map((f) => (
              <Badge
                key={f.value}
                variant={flow === f.value ? "default" : "outline"}
                className={flow === f.value ? "bg-primary" : ""}
              >
                {f.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Symptoms */}
      <div>
        <p className="text-sm font-medium mb-3">Symptoms</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_SYMPTOMS.map((symptom) => (
            <Badge
              key={symptom}
              variant={symptoms.includes(symptom) ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                symptoms.includes(symptom)
                  ? "bg-gradient-to-r from-primary to-accent"
                  : "hover:border-primary"
              }`}
              onClick={() => toggleSymptom(symptom)}
            >
              {symptom}
            </Badge>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-sm font-medium mb-3">Notes</p>
        <Textarea
          placeholder="How are you feeling today, babe? Any thoughts to share..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[80px] border-primary/20"
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-to-r from-primary to-accent"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Log"}
      </Button>
    </Card>
  );
};
