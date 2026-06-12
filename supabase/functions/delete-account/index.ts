// Deletes the authenticated user's account and all related data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the requesting user from JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "(no email)";
    const requestId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const admin = createClient(supabaseUrl, serviceKey);

    console.log(JSON.stringify({
      tag: "delete-account",
      event: "start",
      requestId,
      userId,
      userEmail,
      startedAt,
    }));

    // Delete all user data and verify each result
    const deletions = await Promise.all([
      admin.from("symptoms").delete().eq("user_id", userId),
      admin.from("daily_logs").delete().eq("user_id", userId),
      admin.from("period_logs").delete().eq("user_id", userId),
      admin.from("cycle_data").delete().eq("user_id", userId),
      admin.from("partner_links").delete().or(`owner_id.eq.${userId},partner_id.eq.${userId}`),
      admin.from("profiles").delete().eq("id", userId),
    ]);

    const tables = ["symptoms", "daily_logs", "period_logs", "cycle_data", "partner_links", "profiles"];
    const failures = deletions
      .map((r, i) => (r.error ? { table: tables[i], error: r.error.message } : null))
      .filter(Boolean);

    if (failures.length > 0) {
      console.error(JSON.stringify({
        tag: "delete-account",
        event: "table_failures",
        requestId,
        userId,
        failures,
      }));
      return new Response(
        JSON.stringify({ error: "Failed to delete user data", failures }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error(JSON.stringify({
        tag: "delete-account",
        event: "auth_delete_failed",
        requestId,
        userId,
        error: delErr.message,
      }));
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completedAt = new Date().toISOString();
    console.log(JSON.stringify({
      tag: "delete-account",
      event: "success",
      requestId,
      userId,
      userEmail,
      startedAt,
      completedAt,
      tablesCleared: tables,
    }));

    return new Response(JSON.stringify({ success: true, requestId, completedAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
