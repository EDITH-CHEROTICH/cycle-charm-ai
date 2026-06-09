import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Lock, MessageCircle, Mail, Send, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePremium } from "@/hooks/use-premium";
import { PremiumFeatureGate } from "@/components/PremiumFeatureGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Copy, Share2, Trash2, Users, Sparkles } from "lucide-react";
import { differenceInDays, addDays, format } from "date-fns";

interface PartnerLink {
  id: string;
  owner_id: string;
  partner_id: string | null;
  invite_code: string;
  status: string;
  accepted_at: string | null;
  created_at: string;
}

interface OwnerSummary {
  ownerId: string;
  displayName: string;
  phase: string;
  dayInPhase: number;
  nextPeriod: string | null;
  daysUntil: number | null;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const calcPhase = (lastPeriod: string, cycleLen: number, periodLen: number) => {
  const today = new Date();
  const last = new Date(lastPeriod);
  const daysSince = differenceInDays(today, last);

  if (daysSince < 0) return { phase: "Tracking", dayInPhase: 0 };
  if (daysSince >= cycleLen) return { phase: "Period Delayed", dayInPhase: daysSince - cycleLen + 1 };
  if (daysSince < periodLen) return { phase: "Period", dayInPhase: daysSince + 1 };

  const ovulationDay = cycleLen - 14;
  if (daysSince < ovulationDay - 4) return { phase: "Follicular", dayInPhase: daysSince - periodLen + 1 };
  if (daysSince <= ovulationDay + 1) return { phase: "Ovulation", dayInPhase: daysSince - (ovulationDay - 4) + 1 };
  return { phase: "Luteal", dayInPhase: daysSince - (ovulationDay + 1) + 1 };
};

const PartnerInner = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [myInvites, setMyInvites] = useState<PartnerLink[]>([]);
  const [linkedOwners, setLinkedOwners] = useState<OwnerSummary[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAll = async (uid: string) => {
    const { data: invites } = await supabase
      .from("partner_links")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    setMyInvites((invites as PartnerLink[]) || []);

    const { data: asPartner } = await supabase
      .from("partner_links")
      .select("*")
      .eq("partner_id", uid)
      .eq("status", "active");

    const summaries: OwnerSummary[] = [];
    for (const link of (asPartner as PartnerLink[]) || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", link.owner_id)
        .maybeSingle();
      const { data: cycle } = await supabase
        .from("cycle_data")
        .select("*")
        .eq("user_id", link.owner_id)
        .maybeSingle();

      if (cycle) {
        const { phase, dayInPhase } = calcPhase(
          cycle.last_period_date,
          cycle.average_cycle_length || 28,
          cycle.average_period_length || 5
        );
        const next = addDays(new Date(cycle.last_period_date), cycle.average_cycle_length || 28);
        const daysUntil = differenceInDays(next, new Date());
        summaries.push({
          ownerId: link.owner_id,
          displayName: profile?.display_name || "Your partner",
          phase,
          dayInPhase,
          nextPeriod: format(next, "MMM d, yyyy"),
          daysUntil,
        });
      } else {
        summaries.push({
          ownerId: link.owner_id,
          displayName: profile?.display_name || "Your partner",
          phase: "Not tracking yet",
          dayInPhase: 0,
          nextPeriod: null,
          daysUntil: null,
        });
      }
    }
    setLinkedOwners(summaries);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      await loadAll(session.user.id);
    })();
  }, [navigate]);

  const createInvite = async () => {
    if (!userId) return;
    setLoading(true);
    const code = generateCode();
    const { error } = await supabase.from("partner_links").insert({
      owner_id: userId,
      invite_code: code,
      status: "pending",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Oops", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invite created 💕", description: `Share code ${code} with your partner.` });
    loadAll(userId);
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("partner_links").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not revoke", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removed", description: "The partner link has been revoked." });
    if (userId) loadAll(userId);
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `Code ${code} copied to clipboard.` });
  };

  const buildShareText = (code: string) =>
    `💞 Join me on Cycle Charm as my partner! Use my invite code: ${code}\n\nDownload: https://cycle-charm-ai.lovable.app`;

  const nativeShare = async (code: string) => {
    const text = buildShareText(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Cycle Charm Partner Invite", text });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const shareTo = (platform: string, code: string) => {
    const text = buildShareText(code);
    const encoded = encodeURIComponent(text);
    let url = "";
    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encoded}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encoded}`;
        break;
      case "telegram":
        url = `https://t.me/share/url?url=${encodeURIComponent("https://cycle-charm-ai.lovable.app")}&text=${encoded}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://cycle-charm-ai.lovable.app")}&quote=${encoded}`;
        break;
      case "sms":
        url = `sms:?body=${encoded}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent("Join me on Cycle Charm 💞")}&body=${encoded}`;
        break;
      case "snapchat":
        // Snapchat has no web share intent — copy and open the app
        copyCode(code);
        toast({ title: "Copied! 💛", description: "Paste it into Snapchat to share." });
        url = "https://www.snapchat.com/";
        break;
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };


  const acceptCode = async () => {
    if (!userId || !codeInput.trim()) return;
    setLoading(true);
    const code = codeInput.trim().toUpperCase();

    // Find pending invite
    const { data: invite, error: findErr } = await supabase
      .from("partner_links")
      .select("*")
      .eq("invite_code", code)
      .eq("status", "pending")
      .is("partner_id", null)
      .maybeSingle();

    if (findErr || !invite) {
      setLoading(false);
      toast({ title: "Invalid code", description: "That invite code doesn't exist or was already used.", variant: "destructive" });
      return;
    }

    if (invite.owner_id === userId) {
      setLoading(false);
      toast({ title: "Can't link to yourself 💜", description: "Share this code with someone else.", variant: "destructive" });
      return;
    }

    const { error: updErr } = await supabase
      .from("partner_links")
      .update({
        partner_id: userId,
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    setLoading(false);
    if (updErr) {
      toast({ title: "Could not accept", description: updErr.message, variant: "destructive" });
      return;
    }
    setCodeInput("");
    toast({ title: "Linked! 💞", description: "You're now connected with your partner." });
    loadAll(userId);
  };

  const phaseColor = (phase: string) => {
    if (phase === "Period" || phase === "Period Delayed") return "bg-rose-500/10 text-rose-600 border-rose-300";
    if (phase === "Ovulation") return "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-300";
    if (phase === "Follicular") return "bg-emerald-500/10 text-emerald-600 border-emerald-300";
    if (phase === "Luteal") return "bg-amber-500/10 text-amber-600 border-amber-300";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Partner Access
          </h1>
        </div>

        {/* Linked partners viewing me */}
        <Card className="p-5 border-primary/20 mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Invite your partner
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Share a one-time code so your partner can see your current phase and next period.
          </p>
          <Button
            onClick={createInvite}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            Generate Invite Code
          </Button>

          {myInvites.length > 0 && (
            <div className="mt-4 space-y-2">
              {myInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary/10 bg-card"
                >
                  <div>
                    <div className="font-mono text-lg font-bold tracking-widest">{inv.invite_code}</div>
                    <Badge
                      variant="outline"
                      className={inv.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-300" : ""}
                    >
                      {inv.status === "active" ? "Linked 💞" : "Waiting"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {inv.status === "pending" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => copyCode(inv.invite_code)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => shareCode(inv.invite_code)}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => revokeInvite(inv.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Accept a code */}
        <Card className="p-5 border-primary/20 mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Connect to a partner
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Have a code from someone? Enter it to view their cycle.
          </p>
          <Label htmlFor="code">Invite Code</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="font-mono tracking-widest"
            />
            <Button onClick={acceptCode} disabled={loading || !codeInput.trim()}>
              Connect
            </Button>
          </div>
        </Card>

        {/* Owners I'm linked to */}
        {linkedOwners.length > 0 && (
          <>
            <Separator className="my-4" />
            <h2 className="font-semibold mb-3">Partners you support 💜</h2>
            <div className="space-y-3">
              {linkedOwners.map((o) => (
                <Card key={o.ownerId} className="p-4 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{o.displayName}</div>
                    <Badge variant="outline" className={phaseColor(o.phase)}>
                      {o.phase}
                      {o.dayInPhase > 0 ? ` · Day ${o.dayInPhase}` : ""}
                    </Badge>
                  </div>
                  {o.nextPeriod && (
                    <p className="text-sm text-muted-foreground">
                      Next period: <span className="font-medium text-foreground">{o.nextPeriod}</span>
                      {o.daysUntil !== null && o.daysUntil >= 0 && ` (in ${o.daysUntil} days)`}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      <Navigation />
    </div>
  );
};

const PREVIEW_KEY = "partner:preview";

const Partner = () => {
  const { isPremium, loading } = usePremium();
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(PREVIEW_KEY) === "1"
  );

  const enablePreview = () => {
    localStorage.setItem(PREVIEW_KEY, "1");
    setPreviewMode(true);
  };
  const disablePreview = () => {
    localStorage.removeItem(PREVIEW_KEY);
    setPreviewMode(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (isPremium || previewMode) {
    return (
      <>
        {!isPremium && previewMode && (
          <div className="max-w-md mx-auto px-4 pt-3">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5 text-xs text-muted-foreground">
              <span>👀 Preview mode — upgrade to keep Partner Access.</span>
              <Button size="sm" variant="ghost" onClick={disablePreview} className="h-6 text-xs">
                Exit
              </Button>
            </div>
          </div>
        )}
        <PartnerInner />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Card className="p-6 text-center border-primary/20 mt-4">
          <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Partner Access — Premium</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Share your cycle with your partner so they can support you better.
          </p>
          <Button
            onClick={() => navigate("/subscription")}
            className="w-full bg-gradient-to-r from-primary to-accent mb-3"
          >
            Upgrade Now
          </Button>
          <Button
            variant="outline"
            onClick={enablePreview}
            className="w-full border-primary/30"
          >
            ✨ Preview for free (temporary)
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">
            Temporary access on this device — for trying out the feature.
          </p>
        </Card>
      </div>
      <Navigation />
    </div>
  );
};

export default Partner;
