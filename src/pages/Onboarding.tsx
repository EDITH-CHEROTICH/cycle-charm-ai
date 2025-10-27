import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [lastPeriodDate, setLastPeriodDate] = useState<Date | undefined>(undefined);
  const [cycleLength, setCycleLength] = useState("28");
  const [periodLength, setPeriodLength] = useState("5");
  const [age, setAge] = useState("");
  const [contraception, setContraception] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const symptomOptions = [
    "Cramps",
    "Headache",
    "Mood Swings",
    "Fatigue",
    "Bloating",
    "Breast Tenderness",
    "Acne",
    "Back Pain",
  ];

  const toggleSymptom = (symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = async () => {
    if (!lastPeriodDate) {
      toast({
        title: "Hold on, babe!",
        description: "Please select your last period date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile
      await supabase
        .from("profiles")
        .update({ age: parseInt(age), contraception_use: contraception })
        .eq("id", user.id);

      // Insert cycle data
      await supabase.from("cycle_data").insert([
        {
          user_id: user.id,
          last_period_date: lastPeriodDate.toISOString().split("T")[0],
          average_cycle_length: parseInt(cycleLength),
          average_period_length: parseInt(periodLength),
        },
      ]);

      // Insert symptoms
      if (symptoms.length > 0) {
        const symptomData = symptoms.map((symptom) => ({
          user_id: user.id,
          symptom_name: symptom,
        }));
        await supabase.from("symptoms").insert(symptomData);
      }

      toast({
        title: "All set, darling! 💜",
        description: "Let's track your beautiful cycle together!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-2xl p-8 backdrop-blur-sm bg-card/90 shadow-2xl border-2 border-primary/20">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Let's Get to Know You, Babe 💜
          </h2>
          <p className="text-center text-muted-foreground">
            Step {step} of 5
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold mb-2">When was your last period?</h3>
              <p className="text-sm text-muted-foreground">
                This helps me predict your next cycle, darling!
              </p>
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={lastPeriodDate}
                onSelect={setLastPeriodDate}
                className="rounded-md border border-primary/30"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold mb-2">How long is your cycle?</h3>
              <p className="text-sm text-muted-foreground">
                The average is 28 days, but everyone is unique!
              </p>
            </div>
            <div className="space-y-2">
              <Label>Cycle Length (days)</Label>
              <Input
                type="number"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="border-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Period Duration (days)</Label>
              <Input
                type="number"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                className="border-primary/30"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold mb-2">Tell me about you</h3>
              <p className="text-sm text-muted-foreground">
                This helps personalize your experience!
              </p>
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Your age"
                className="border-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Contraception Method (optional)</Label>
              <Input
                type="text"
                value={contraception}
                onChange={(e) => setContraception(e.target.value)}
                placeholder="e.g., Birth control pills, IUD, None"
                className="border-primary/30"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold mb-2">Common symptoms?</h3>
              <p className="text-sm text-muted-foreground">
                Select all that you usually experience, babe
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {symptomOptions.map((symptom) => (
                <div key={symptom} className="flex items-center space-x-2">
                  <Checkbox
                    id={symptom}
                    checked={symptoms.includes(symptom)}
                    onCheckedChange={() => toggleSymptom(symptom)}
                  />
                  <label htmlFor={symptom} className="text-sm cursor-pointer">
                    {symptom}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🌸</div>
            <h3 className="text-2xl font-semibold">All Done, Darling!</h3>
            <p className="text-muted-foreground">
              Ready to start tracking your beautiful cycle? Let's go! 💜
            </p>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              if (step < 5) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={loading || (step === 1 && !lastPeriodDate)}
            className="flex-1 bg-gradient-to-r from-primary to-accent"
          >
            {loading ? "Saving..." : step === 5 ? "Finish" : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
