import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ACTIONS = [
  "create-account",
  "suspend",
  "unsuspend",
  "delete",
  "create-db",
  "create-email",
  "ssl",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Get secrets
    const VPS_API_KEY = Deno.env.get("VPS_API_KEY");
    if (!VPS_API_KEY) {
      console.error("VPS_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "VPS API not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let VPS_API_URL =
      Deno.env.get("VPS_API_URL") || "https://panel.vin-tech.top/api";
    // Ensure URL has a protocol
    if (!/^https?:\/\//i.test(VPS_API_URL)) {
      VPS_API_URL = `https://${VPS_API_URL}`;
    }

    // Parse request
    const { action, ...params } = await req.json();

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({
          error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[vps-api] User ${userId} requesting action: ${action}`,
      params
    );

    // Forward to VPS API
    const vpsResponse = await fetch(`${VPS_API_URL}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VPS_API_KEY}`,
      },
      body: JSON.stringify({ ...params, user_id: userId }),
    });

    const responseText = await vpsResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(
      `[vps-api] VPS response for ${action}: status=${vpsResponse.status}`,
      responseData
    );

    if (!vpsResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "VPS API request failed",
          status: vpsResponse.status,
          details: responseData,
        }),
        {
          status: vpsResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[vps-api] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
