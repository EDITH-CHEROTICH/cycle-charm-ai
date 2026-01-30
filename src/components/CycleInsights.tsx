import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { format, subMonths, differenceInDays } from "date-fns";
import { TrendingUp, Calendar, Activity, Heart } from "lucide-react";

interface CycleInsightsProps {
  refreshTrigger?: number;
}

export const CycleInsights = ({ refreshTrigger }: CycleInsightsProps) => {
  const [cycleData, setCycleData] = useState<any[]>([]);
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [averages, setAverages] = useState({
    cycleLength: 0,
    periodLength: 0,
    variation: 0
  });

  useEffect(() => {
    loadInsights();
  }, [refreshTrigger]);

  const loadInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get period logs for cycle analysis
      const { data: periods } = await supabase
        .from("period_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: true });

      if (periods && periods.length > 1) {
        // Calculate cycle lengths
        const cycles = [];
        for (let i = 1; i < periods.length; i++) {
          const prevStart = new Date(periods[i-1].start_date);
          const currStart = new Date(periods[i].start_date);
          const length = differenceInDays(currStart, prevStart);
          if (length > 15 && length < 60) {
            cycles.push({
              month: format(currStart, "MMM"),
              cycleLength: length,
              periodLength: periods[i].end_date 
                ? differenceInDays(new Date(periods[i].end_date), currStart) + 1
                : 5
            });
          }
        }
        setCycleData(cycles.slice(-6)); // Last 6 cycles

        // Calculate averages
        if (cycles.length > 0) {
          const avgCycle = cycles.reduce((a, b) => a + b.cycleLength, 0) / cycles.length;
          const avgPeriod = cycles.reduce((a, b) => a + b.periodLength, 0) / cycles.length;
          const variation = Math.max(...cycles.map(c => c.cycleLength)) - Math.min(...cycles.map(c => c.cycleLength));
          setAverages({
            cycleLength: Math.round(avgCycle),
            periodLength: Math.round(avgPeriod),
            variation
          });
        }
      }

      // Get symptom frequency
      const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-dd");
      const { data: symptoms } = await supabase
        .from("symptoms")
        .select("symptom_name")
        .eq("user_id", user.id)
        .gte("log_date", threeMonthsAgo);

      if (symptoms) {
        const symptomCounts: Record<string, number> = {};
        symptoms.forEach(s => {
          symptomCounts[s.symptom_name] = (symptomCounts[s.symptom_name] || 0) + 1;
        });
        const sortedSymptoms = Object.entries(symptomCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setSymptomData(sortedSymptoms);
      }

      // Get mood trends
      const { data: moods } = await supabase
        .from("daily_logs")
        .select("log_date, mood, energy_level")
        .eq("user_id", user.id)
        .gte("log_date", threeMonthsAgo)
        .order("log_date", { ascending: true });

      if (moods) {
        const moodMap: Record<string, number> = {
          "great": 5, "good": 4, "okay": 3, "low": 2, "stressed": 1
        };
        const moodTrend = moods.map(m => ({
          date: format(new Date(m.log_date), "MM/dd"),
          mood: moodMap[m.mood as string] || 3,
          energy: m.energy_level || 3
        })).slice(-14); // Last 14 days
        setMoodData(moodTrend);
      }
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(280 70% 60%)', 'hsl(var(--accent))', '#FF8042', '#00C49F'];

  if (loading) {
    return (
      <Card className="p-6 border-primary/20">
        <div className="text-center text-muted-foreground">Loading insights...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center border-primary/20">
          <p className="text-2xl font-bold text-primary">{averages.cycleLength || "--"}</p>
          <p className="text-xs text-muted-foreground">Avg Cycle</p>
        </Card>
        <Card className="p-4 text-center border-primary/20">
          <p className="text-2xl font-bold text-primary">{averages.periodLength || "--"}</p>
          <p className="text-xs text-muted-foreground">Avg Period</p>
        </Card>
        <Card className="p-4 text-center border-primary/20">
          <p className="text-2xl font-bold text-primary">±{averages.variation || "--"}</p>
          <p className="text-xs text-muted-foreground">Variation</p>
        </Card>
      </div>

      <Tabs defaultValue="cycles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cycles" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" /> Cycles
          </TabsTrigger>
          <TabsTrigger value="symptoms" className="text-xs">
            <Activity className="w-3 h-3 mr-1" /> Symptoms
          </TabsTrigger>
          <TabsTrigger value="mood" className="text-xs">
            <Heart className="w-3 h-3 mr-1" /> Mood
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cycles">
          <Card className="p-4 border-primary/20">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Cycle Length Trend
            </h4>
            {cycleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cycleData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis domain={[20, 40]} fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cycleLength" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                    name="Cycle Days"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Log more periods to see your cycle trends, babe! 💜
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="symptoms">
          <Card className="p-4 border-primary/20">
            <h4 className="font-medium mb-4">Top Symptoms (Last 3 Months)</h4>
            {symptomData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={symptomData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={11} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Start tracking symptoms to see patterns, darling! ✨
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="mood">
          <Card className="p-4 border-primary/20">
            <h4 className="font-medium mb-4">Mood & Energy (Last 2 Weeks)</h4>
            {moodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={moodData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis domain={[0, 5]} fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Mood"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="hsl(280 70% 60%)" 
                    strokeWidth={2}
                    name="Energy"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Log your daily mood to see trends, babe! 💜
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
