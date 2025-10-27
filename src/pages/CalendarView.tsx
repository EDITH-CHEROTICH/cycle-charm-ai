import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";

const CalendarView = () => {
  const [cycleData, setCycleData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("cycle_data")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setCycleData(data);
    };

    checkAuth();
  }, [navigate]);

  const isPeriodDay = (date: Date) => {
    if (!cycleData) return false;

    const lastPeriod = new Date(cycleData.last_period_date);
    const daysSinceLastPeriod = Math.floor(
      (date.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24)
    );

    const cycleDay = daysSinceLastPeriod % cycleData.average_cycle_length;
    return cycleDay >= 0 && cycleDay < cycleData.average_period_length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
          Your Cycle Calendar 📅
        </h1>

        <Card className="p-6 border-primary/20 mb-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md"
              modifiers={{
                period: (date) => isPeriodDay(date),
              }}
              modifiersStyles={{
                period: {
                  backgroundColor: "hsl(var(--primary))",
                  color: "white",
                  fontWeight: "bold",
                },
              }}
            />
          </div>
        </Card>

        <Card className="p-4 border-primary/20">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary"></div>
              <span>Period Days</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-accent/30"></div>
              <span>Other Days</span>
            </div>
          </div>
        </Card>
      </div>
      <Navigation />
    </div>
  );
};

export default CalendarView;
