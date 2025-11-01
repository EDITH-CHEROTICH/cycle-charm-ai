import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

const COMMON_SYMPTOMS = [
  "Cramps",
  "Bloating",
  "Headache",
  "Fatigue",
  "Mood Swings",
  "Breast Tenderness",
  "Acne",
  "Back Pain",
  "Nausea",
  "Food Cravings",
];

export const SymptomTracker = () => {
  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTodaySymptoms();
  }, []);

  const loadTodaySymptoms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("symptoms")
        .select("symptom_name")
        .eq("user_id", user.id)
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59");

      if (error) throw error;
      setTodaySymptoms(data?.map(s => s.symptom_name) || []);
    } catch (error: any) {
      console.error("Error loading symptoms:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = async (symptom: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isActive = todaySymptoms.includes(symptom);

      if (isActive) {
        // Remove symptom
        const { error } = await supabase
          .from("symptoms")
          .delete()
          .eq("user_id", user.id)
          .eq("symptom_name", symptom)
          .gte("created_at", new Date().toISOString().split('T')[0] + "T00:00:00");

        if (error) throw error;
        setTodaySymptoms(todaySymptoms.filter(s => s !== symptom));
      } else {
        // Add symptom
        const { error } = await supabase
          .from("symptoms")
          .insert({
            user_id: user.id,
            symptom_name: symptom,
          });

        if (error) throw error;
        setTodaySymptoms([...todaySymptoms, symptom]);
      }

      toast({
        title: isActive ? "Symptom removed" : "Symptom logged",
        description: `${symptom} ${isActive ? "removed from" : "added to"} today's log`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="p-6 border-primary/20">
      <h3 className="font-semibold text-lg mb-4">Today's Symptoms</h3>
      <div className="flex flex-wrap gap-2">
        {COMMON_SYMPTOMS.map((symptom) => {
          const isActive = todaySymptoms.includes(symptom);
          return (
            <Badge
              key={symptom}
              variant={isActive ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                isActive
                  ? "bg-gradient-to-r from-primary to-accent"
                  : "hover:border-primary"
              }`}
              onClick={() => toggleSymptom(symptom)}
            >
              {isActive ? (
                <X className="w-3 h-3 mr-1" />
              ) : (
                <Plus className="w-3 h-3 mr-1" />
              )}
              {symptom}
            </Badge>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Tap to add or remove symptoms you're experiencing today
      </p>
    </Card>
  );
};
