import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Trash2, Calendar as CalendarIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PeriodLog {
  id: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface PeriodHistoryProps {
  refreshTrigger?: number;
}

export const PeriodHistory = ({ refreshTrigger }: PeriodHistoryProps) => {
  const [logs, setLogs] = useState<PeriodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("period_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("period_logs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Period log removed",
      });

      loadLogs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading history...</div>;
  }

  if (logs.length === 0) {
    return (
      <Card className="p-6 border-primary/20 text-center">
        <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">No period logs yet</p>
        <p className="text-sm text-muted-foreground mt-1">Start logging to track your cycle</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-primary/20">
      <h3 className="font-semibold text-lg mb-4">Period History</h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10"
          >
            <div>
              <p className="font-medium">
                {format(new Date(log.start_date + 'T00:00:00'), "MMM d, yyyy")}
                {log.end_date && (
                  <span className="text-muted-foreground">
                    {" "}- {format(new Date(log.end_date + 'T00:00:00'), "MMM d, yyyy")}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {log.end_date
                  ? `${Math.round((new Date(log.end_date + 'T00:00:00').getTime() - new Date(log.start_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                  : "Ongoing"}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete period log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this period log.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(log.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </Card>
  );
};
