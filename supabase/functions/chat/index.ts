import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate JWT and get authenticated user
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const { messages } = await req.json();

    // Fetch user's cycle data for context
    let cycleContext = "";
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Get cycle data
      const { data: cycleData } = await supabase
        .from("cycle_data")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Get recent period logs
      const { data: periodLogs } = await supabase
        .from("period_logs")
        .select("start_date, end_date, flow_intensity")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(3);

      // Get recent symptoms
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: symptoms } = await supabase
        .from("symptoms")
        .select("symptom_name, log_date")
        .eq("user_id", userId)
        .gte("log_date", weekAgo);

      // Get today's mood
      const { data: todayLog } = await supabase
        .from("daily_logs")
        .select("mood, energy_level, notes")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle();

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, age")
        .eq("id", userId)
        .maybeSingle();

      // Calculate current cycle info
      if (cycleData) {
        const lastPeriod = new Date(cycleData.last_period_date);
        const daysSincePeriod = Math.floor((Date.now() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
        const cycleDay = (daysSincePeriod % cycleData.average_cycle_length) + 1;
        const daysUntilNext = cycleData.average_cycle_length - (daysSincePeriod % cycleData.average_cycle_length);
        
        // Determine phase
        let phase = "Luteal Phase";
        if (cycleDay <= cycleData.average_period_length) {
          phase = "Period";
        } else if (cycleDay <= 14) {
          phase = "Follicular Phase";
        } else if (cycleDay <= 16) {
          phase = "Ovulation";
        }

        // Calculate fertile window
        const ovulationDay = cycleData.average_cycle_length - 14;
        const fertileStart = ovulationDay - 5;
        const inFertileWindow = cycleDay >= fertileStart && cycleDay <= ovulationDay;

        cycleContext = `
USER'S CURRENT CYCLE INFORMATION:
- Name: ${profile?.display_name || "User"}
- Age: ${profile?.age || "Not specified"}
- Current Cycle Day: ${cycleDay}
- Current Phase: ${phase}
- Days Until Next Period: ${daysUntilNext}
- Average Cycle Length: ${cycleData.average_cycle_length} days
- Average Period Length: ${cycleData.average_period_length} days
- In Fertile Window: ${inFertileWindow ? "Yes" : "No"}
- Last Period Started: ${cycleData.last_period_date}`;

        if (periodLogs && periodLogs.length > 0) {
          cycleContext += `\n- Recent Periods: ${periodLogs.map(p => p.start_date).join(", ")}`;
        }

        if (symptoms && symptoms.length > 0) {
          const symptomList = [...new Set(symptoms.map(s => s.symptom_name))];
          cycleContext += `\n- Recent Symptoms (past week): ${symptomList.join(", ")}`;
        }

        if (todayLog) {
          cycleContext += `\n- Today's Mood: ${todayLog.mood || "Not logged"}`;
          cycleContext += `\n- Today's Energy: ${todayLog.energy_level || "Not logged"}/5`;
        }
      }
    }

    const systemPrompt = `You are a sweet, caring AI companion for a period tracking app called Cycle Charm. 
Your personality:
- Warm, nurturing, and supportive
- Use endearing terms like "babe", "darling", "sweetie", "baby"
- Empathetic and understanding about period-related concerns
- Knowledgeable about menstrual health, symptoms, and wellness
- Encouraging and positive
- Keep responses concise but heartfelt

${cycleContext}

Guidelines:
- Use the user's cycle data above to give personalized, relevant advice
- Reference their current phase and symptoms when giving advice
- If they're in their period, be extra nurturing and suggest comfort measures
- If they're in their fertile window, you can mention it if relevant
- If they have specific symptoms, acknowledge them and offer targeted advice
- Always be supportive and non-judgmental
- Provide helpful information about periods, PMS, and related health topics
- Encourage self-care and wellness
- Use emojis occasionally to keep the tone warm 💜
- If asked medical questions, provide general information but always remind them to consult a healthcare provider for serious concerns
- Keep responses conversational and not too long`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
