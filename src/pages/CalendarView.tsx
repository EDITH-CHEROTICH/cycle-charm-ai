import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { EnhancedCalendar } from "@/components/EnhancedCalendar";
import { DailyLogger } from "@/components/DailyLogger";
import { PeriodLogger } from "@/components/PeriodLogger";
import { PeriodHistory } from "@/components/PeriodHistory";
import { CycleInsights } from "@/components/CycleInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Pencil, BarChart3, History } from "lucide-react";

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handlePeriodLogged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
          Your Cycle 📅
        </h1>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calendar" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs">
              <Pencil className="w-3 h-3 mr-1" /> Log
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" /> Insights
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="w-3 h-3 mr-1" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <EnhancedCalendar 
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
            <DailyLogger 
              selectedDate={selectedDate}
              onLogSaved={() => setRefreshTrigger(prev => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="log" className="space-y-4">
            <PeriodLogger onPeriodLogged={handlePeriodLogged} />
            <DailyLogger 
              selectedDate={selectedDate}
              onLogSaved={() => setRefreshTrigger(prev => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="insights">
            <CycleInsights refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="history">
            <PeriodHistory refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
      <Navigation />
    </div>
  );
};

export default CalendarView;
