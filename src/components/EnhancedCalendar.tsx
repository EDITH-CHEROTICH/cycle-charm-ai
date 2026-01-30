import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isSameDay, isWithinInterval, startOfDay } from "date-fns";

interface PeriodLog {
  id: string;
  start_date: string;
  end_date: string | null;
}

interface CycleData {
  last_period_date: string;
  average_cycle_length: number;
  average_period_length: number;
}

interface EnhancedCalendarProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

export const EnhancedCalendar = ({ onDateSelect, selectedDate }: EnhancedCalendarProps) => {
  const [periodLogs, setPeriodLogs] = useState<PeriodLog[]>([]);
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | undefined>(selectedDate || new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [logsResult, cycleResult] = await Promise.all([
      supabase
        .from("period_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("cycle_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

    if (logsResult.data) setPeriodLogs(logsResult.data);
    if (cycleResult.data) setCycleData(cycleResult.data);
  };

  // Check if date is within an actual logged period
  const isLoggedPeriodDay = (date: Date): boolean => {
    const checkDate = startOfDay(date);
    return periodLogs.some(log => {
      const start = startOfDay(new Date(log.start_date + 'T00:00:00'));
      const end = log.end_date 
        ? startOfDay(new Date(log.end_date + 'T00:00:00'))
        : addDays(start, (cycleData?.average_period_length || 5) - 1);
      return isWithinInterval(checkDate, { start, end });
    });
  };

  // Check if date is a predicted period day (future)
  const isPredictedPeriodDay = (date: Date): boolean => {
    if (!cycleData || isLoggedPeriodDay(date)) return false;
    
    const checkDate = startOfDay(date);
    const today = startOfDay(new Date());
    if (checkDate <= today) return false;

    // Get the most recent period start
    const lastPeriodStart = periodLogs.length > 0
      ? new Date(periodLogs[0].start_date + 'T00:00:00')
      : new Date(cycleData.last_period_date + 'T00:00:00');

    const daysSinceLast = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast < 0) return false;

    const cycleDay = daysSinceLast % cycleData.average_cycle_length;
    return cycleDay >= 0 && cycleDay < cycleData.average_period_length;
  };

  // Check if date is ovulation day (typically day 14 of cycle)
  const isOvulationDay = (date: Date): boolean => {
    if (!cycleData) return false;
    
    const checkDate = startOfDay(date);
    const lastPeriodStart = periodLogs.length > 0
      ? new Date(periodLogs[0].start_date + 'T00:00:00')
      : new Date(cycleData.last_period_date + 'T00:00:00');

    const daysSinceLast = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast < 0) return false;

    const cycleDay = daysSinceLast % cycleData.average_cycle_length;
    // Ovulation typically occurs 14 days before next period
    const ovulationDay = cycleData.average_cycle_length - 14;
    return cycleDay === ovulationDay;
  };

  // Check if date is in fertile window (5 days before ovulation + ovulation day)
  const isFertileDay = (date: Date): boolean => {
    if (!cycleData) return false;
    
    const checkDate = startOfDay(date);
    const lastPeriodStart = periodLogs.length > 0
      ? new Date(periodLogs[0].start_date + 'T00:00:00')
      : new Date(cycleData.last_period_date + 'T00:00:00');

    const daysSinceLast = Math.floor((checkDate.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast < 0) return false;

    const cycleDay = daysSinceLast % cycleData.average_cycle_length;
    const ovulationDay = cycleData.average_cycle_length - 14;
    // Fertile window: 5 days before ovulation through ovulation day
    return cycleDay >= ovulationDay - 5 && cycleDay <= ovulationDay;
  };

  const handleSelect = (date: Date | undefined) => {
    setCurrentDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <Card className="p-6 border-primary/20">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={handleSelect}
          className="rounded-md pointer-events-auto"
          modifiers={{
            loggedPeriod: (date) => isLoggedPeriodDay(date),
            predictedPeriod: (date) => isPredictedPeriodDay(date),
            ovulation: (date) => isOvulationDay(date),
            fertile: (date) => isFertileDay(date) && !isOvulationDay(date),
          }}
          modifiersStyles={{
            loggedPeriod: {
              backgroundColor: "hsl(var(--primary))",
              color: "white",
              fontWeight: "bold",
            },
            predictedPeriod: {
              backgroundColor: "hsl(var(--primary) / 0.4)",
              color: "hsl(var(--primary-foreground))",
              border: "2px dashed hsl(var(--primary))",
            },
            ovulation: {
              backgroundColor: "hsl(280 70% 60%)",
              color: "white",
              fontWeight: "bold",
            },
            fertile: {
              backgroundColor: "hsl(280 70% 60% / 0.3)",
              color: "hsl(var(--foreground))",
            },
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span>Period</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary/40 border-2 border-dashed border-primary"></div>
          <span>Predicted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(280 70% 60%)" }}></div>
          <span>Ovulation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(280 70% 60% / 0.3)" }}></div>
          <span>Fertile</span>
        </div>
      </div>

      {/* Selected date info */}
      {currentDate && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </p>
          <div className="flex justify-center gap-2 mt-2">
            {isLoggedPeriodDay(currentDate) && (
              <Badge className="bg-primary">Period Day</Badge>
            )}
            {isPredictedPeriodDay(currentDate) && (
              <Badge variant="outline" className="border-primary text-primary">Predicted Period</Badge>
            )}
            {isOvulationDay(currentDate) && (
              <Badge style={{ backgroundColor: "hsl(280 70% 60%)" }}>Ovulation Day</Badge>
            )}
            {isFertileDay(currentDate) && !isOvulationDay(currentDate) && (
              <Badge variant="outline" style={{ borderColor: "hsl(280 70% 60%)", color: "hsl(280 70% 60%)" }}>
                Fertile Window
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
