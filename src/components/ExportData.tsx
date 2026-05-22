import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePremium } from "@/hooks/use-premium";
import { useNavigate } from "react-router-dom";

const toCSV = (rows: Record<string, any>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
};

const download = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const ExportData = () => {
  const { isPremium } = usePremium();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!isPremium) {
      navigate("/subscription");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [periods, symptoms, daily] = await Promise.all([
        supabase.from("period_logs").select("*").eq("user_id", user.id).order("start_date"),
        supabase.from("symptoms").select("*").eq("user_id", user.id).order("log_date"),
        supabase.from("daily_logs").select("*").eq("user_id", user.id).order("log_date"),
      ]);

      const today = new Date().toISOString().split("T")[0];
      if (periods.data?.length) download(`periods-${today}.csv`, toCSV(periods.data));
      if (symptoms.data?.length) download(`symptoms-${today}.csv`, toCSV(symptoms.data));
      if (daily.data?.length) download(`daily-logs-${today}.csv`, toCSV(daily.data));

      toast({
        title: "Exported! 💜",
        description: "Your cycle data has been downloaded.",
      });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 border-primary/20">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Export Your Data
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Download all your cycle, symptom, and daily logs as CSV files.
        {!isPremium && " Premium only."}
      </p>
      <Button
        onClick={handleExport}
        disabled={loading}
        className="w-full bg-gradient-to-r from-primary to-accent"
      >
        <Download className="w-4 h-4 mr-2" />
        {loading ? "Exporting..." : isPremium ? "Export to CSV" : "Upgrade to Export"}
      </Button>
    </Card>
  );
};
