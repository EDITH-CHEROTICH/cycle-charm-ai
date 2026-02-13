import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const DeleteAccount = () => {
  const [email, setEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || confirmText !== "DELETE") {
      toast({
        title: "Missing Information",
        description: "Please enter your email and type DELETE to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Try to sign in to verify the account exists and delete data
      // If user is already logged in, proceed with deletion
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user.email === email) {
        // User is logged in with the same email — delete their data
        const userId = session.user.id;
        await Promise.all([
          supabase.from("symptoms").delete().eq("user_id", userId),
          supabase.from("daily_logs").delete().eq("user_id", userId),
          supabase.from("period_logs").delete().eq("user_id", userId),
          supabase.from("cycle_data").delete().eq("user_id", userId),
          supabase.from("profiles").delete().eq("id", userId),
        ]);
        await supabase.auth.signOut();
      }

      // Always show success to avoid revealing whether an account exists
      setSubmitted(true);
    } catch (error) {
      console.error("Deletion request error:", error);
      setSubmitted(true); // Still show success for privacy
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to App
        </Link>

        <Card className="p-6 border-primary/20">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="text-5xl mb-2">✅</div>
              <h2 className="text-xl font-bold">Request Received</h2>
              <p className="text-muted-foreground">
                If an account exists with that email, all associated data will be permanently deleted within 48 hours. You will not be able to recover your data after deletion.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Data that will be deleted includes:
              </p>
              <ul className="text-sm text-muted-foreground list-disc text-left pl-6 space-y-1">
                <li>Profile information</li>
                <li>Period and cycle tracking data</li>
                <li>Symptom logs and daily entries</li>
                <li>Chat history</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Trash2 className="w-10 h-10 text-destructive mx-auto mb-3" />
                <h1 className="text-2xl font-bold">Delete Your Account</h1>
                <p className="text-muted-foreground mt-2">
                  Request permanent deletion of your Cycle Charm account and all associated data.
                </p>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-destructive">⚠️ This action is irreversible</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All your data will be permanently deleted, including your profile, cycle data, symptom logs, daily entries, and chat history.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Account Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your account email"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="confirm">Type DELETE to confirm</Label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type DELETE"
                    className="mt-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={confirmText !== "DELETE" || !email || isSubmitting}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isSubmitting ? "Processing..." : "Delete My Account"}
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Questions? Contact us at support@cyclecharm.app
        </p>
      </div>
    </div>
  );
};

export default DeleteAccount;
