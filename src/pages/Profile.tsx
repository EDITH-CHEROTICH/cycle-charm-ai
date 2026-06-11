import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePremium } from "@/hooks/use-premium";
import { useTheme } from "@/hooks/use-theme";
import { Crown, Sparkles, Shield, FileText, Bell, LogOut, Moon, Sun, Baby, Heart, CreditCard } from "lucide-react";
import { openManageSubscription, logoutRevenueCatUser } from "@/lib/revenue-cat";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { ExportData } from "@/components/ExportData";
import { clearCachedData } from "@/hooks/use-offline";

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [cycleData, setCycleData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [age, setAge] = useState("");
  const [contraception, setContraception] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const loadData = async (session: any) => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const { data: cycleInfo } = await supabase
        .from("cycle_data")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setProfile(profileData);
      setCycleData(cycleInfo);
      setAge(profileData?.age?.toString() || "");
      setContraception(profileData?.contraception_use || "");
      setCycleLength(cycleInfo?.average_cycle_length?.toString() || "");
      setPeriodLength(cycleInfo?.average_period_length?.toString() || "");
      setLastPeriodDate(cycleInfo?.last_period_date || "");
    };

    // Set up auth listener FIRST for proper session persistence
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadData(session);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        loadData(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({
          age: parseInt(age),
          contraception_use: contraception,
        })
        .eq("id", user.id);

      await supabase
        .from("cycle_data")
        .update({
          average_cycle_length: parseInt(cycleLength),
          average_period_length: parseInt(periodLength),
          ...(lastPeriodDate ? { last_period_date: lastPeriodDate } : {}),
        })
        .eq("user_id", user.id);

      setCycleData((prev: any) => ({ ...prev, last_period_date: lastPeriodDate }));

      toast({
        title: "Saved!",
        description: "Your profile has been updated, darling! 💜",
      });
      setEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleLogout = async () => {
    clearCachedData();
    await logoutRevenueCatUser();
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 pb-20">
      <div className="max-w-md mx-auto p-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Your Profile ✨
          </h1>
          {isPremium && (
            <Badge className="bg-gradient-to-r from-primary to-accent">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>

        {!premiumLoading && !isPremium && (
          <Card className="p-4 mb-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Upgrade to Premium</p>
                  <p className="text-xs text-muted-foreground">Unlock all features</p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/subscription")}
                size="sm"
                className="bg-gradient-to-r from-primary to-accent"
              >
                Upgrade
              </Button>
            </div>
          </Card>
        )}

        {!premiumLoading && isPremium && (
          <Card className="p-4 mb-4 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Premium Active</p>
                  <p className="text-xs text-muted-foreground">Manage your subscription</p>
                </div>
              </div>
              <Button onClick={openManageSubscription} size="sm" variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6 border-primary/20 mb-4">
          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <p className="text-lg font-medium">{profile.display_name}</p>
            </div>

            <div>
              <Label>Age</Label>
              {editing ? (
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-medium">{age || "Not set"}</p>
              )}
            </div>

            <div>
              <Label>Contraception</Label>
              {editing ? (
                <Input
                  value={contraception}
                  onChange={(e) => setContraception(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-medium">{contraception || "None"}</p>
              )}
            </div>

            <div>
              <Label>Average Cycle Length</Label>
              {editing ? (
                <Input
                  type="number"
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-medium">{cycleLength} days</p>
              )}
            </div>

            <div>
              <Label>Average Period Length</Label>
              {editing ? (
                <Input
                  type="number"
                  value={periodLength}
                  onChange={(e) => setPeriodLength(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-medium">{periodLength} days</p>
              )}
            </div>

            <div>
              <Label>Last Period Start Date</Label>
              {editing ? (
                <>
                  <Input
                    type="date"
                    value={lastPeriodDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setLastPeriodDate(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Update this if your tracking got off, babe 💜
                  </p>
                </>
              ) : (
                <p className="text-lg font-medium">
                  {lastPeriodDate
                    ? new Date(lastPeriodDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not set"}
                </p>
              )}
            </div>
          </div>


          <div className="flex gap-2 mt-6">
            {editing ? (
              <>
                <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-primary to-accent">
                  Save Changes
                </Button>
                <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="w-full bg-gradient-to-r from-primary to-accent">
                Edit Profile
              </Button>
            )}
          </div>
        </Card>

        {/* Appearance Section */}
        <Card className="p-4 border-primary/20 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            {resolvedTheme === "dark" ? (
              <Moon className="w-4 h-4 text-primary" />
            ) : (
              <Sun className="w-4 h-4 text-primary" />
            )}
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">
                {theme === "system" ? "Following system" : resolvedTheme === "dark" ? "On" : "Off"}
              </p>
            </div>
            <Switch
              checked={resolvedTheme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </Card>

        {/* Premium Features Section */}
        <Card className="p-4 border-primary/20 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Premium Features
          </h3>
          <Link to="/pregnancy" className="block">
            <Button variant="ghost" className="w-full justify-start">
              <Baby className="w-4 h-4 mr-2" />
              Pregnancy Mode
              {!isPremium && <Crown className="w-3 h-3 ml-auto text-primary" />}
            </Button>
          </Link>
          <Link to="/partner" className="block">
            <Button variant="ghost" className="w-full justify-start">
              <Heart className="w-4 h-4 mr-2" />
              Partner Access
              {!isPremium && <Crown className="w-3 h-3 ml-auto text-primary" />}
            </Button>
          </Link>
        </Card>

        <div className="mb-4">
          <ExportData />
        </div>


        {/* Settings Section */}
        <Card className="p-4 border-primary/20 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notifications
          </h3>
          <p className="text-sm text-muted-foreground">
            Push notifications for period reminders, fertile window alerts, and daily check-ins are enabled automatically on mobile devices.
          </p>
        </Card>

        {/* Legal Section */}
        <Card className="p-4 border-primary/20 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Legal
          </h3>
          <div className="space-y-2">
            <Link to="/privacy" className="block">
              <Button variant="ghost" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
            </Link>
            <Link to="/terms" className="block">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Terms of Service
              </Button>
            </Link>
          </div>
        </Card>

        {/* Account Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <Separator className="my-4" />

          <DeleteAccountDialog onDeleted={() => navigate("/auth")} />

          <p className="text-xs text-muted-foreground text-center mt-2">
            Deleting your account will permanently remove all your data.
          </p>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Profile;
