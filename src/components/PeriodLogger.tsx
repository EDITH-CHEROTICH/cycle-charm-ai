import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Droplet, Save, X } from "lucide-react";

interface PeriodLoggerProps {
  onPeriodLogged: () => void;
}

export const PeriodLogger = ({ onPeriodLogged }: PeriodLoggerProps) => {
  const [isLogging, setIsLogging] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!startDate) {
      toast({
        title: "Start date required",
        description: "Please select when your period started",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { error } = await supabase
        .from("period_logs")
        .insert({
          user_id: user.id,
          start_date: formatDate(startDate),
          end_date: endDate ? formatDate(endDate) : null,
        });

      if (error) throw error;

      // Update cycle data with the latest period date
      await supabase
        .from("cycle_data")
        .update({
          last_period_date: formatDate(startDate),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      toast({
        title: "Period logged! 💜",
        description: "Your cycle data has been updated",
      });

      setIsLogging(false);
      setStartDate(undefined);
      setEndDate(undefined);
      onPeriodLogged();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isLogging) {
    return (
      <Button
        onClick={() => setIsLogging(true)}
        className="w-full bg-gradient-to-r from-primary to-accent"
      >
        <Droplet className="w-4 h-4 mr-2" />
        Log Period
      </Button>
    );
  }

  return (
    <Card className="p-6 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Log Your Period</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLogging(false);
              setStartDate(undefined);
              setEndDate(undefined);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Start Date *</p>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              className="rounded-md border"
              disabled={(date) => date > new Date()}
            />
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">End Date (optional)</p>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              className="rounded-md border"
              disabled={(date) => !startDate || date < startDate || date > new Date()}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full bg-gradient-to-r from-primary to-accent">
          <Save className="w-4 h-4 mr-2" />
          Save Period Log
        </Button>
      </div>
    </Card>
  );
};
