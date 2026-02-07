import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map our action names to CyberPanel API endpoint names
// Source: https://github.com/usmannasir/cyberpanel/blob/stable/api/urls.py
const ACTION_TO_ENDPOINT: Record<string, string> = {
  "create-account": "createWebsite",
  "suspend": "submitWebsiteStatus",
  "unsuspend": "submitWebsiteStatus",
  "delete": "deleteWebsite",
  "verify": "verifyConn",
};

const VALID_ACTIONS = Object.keys(ACTION_TO_ENDPOINT);

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

    // Get CyberPanel credentials
    const CYBERPANEL_USER = Deno.env.get("CYBERPANEL_USER");
    const CYBERPANEL_PASS = Deno.env.get("CYBERPANEL_PASS");
    if (!CYBERPANEL_USER || !CYBERPANEL_PASS) {
      console.error("CyberPanel credentials not configured");
      return new Response(
        JSON.stringify({ error: "CyberPanel credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let VPS_API_URL =
      Deno.env.get("VPS_API_URL") || "https://panel.vintechcyber.com:8090/api";
    // Ensure protocol exists
    if (!/^https?:\/\//i.test(VPS_API_URL)) {
      VPS_API_URL = `http://${VPS_API_URL}`;
    }
    // Remove trailing slash to avoid double slashes
    VPS_API_URL = VPS_API_URL.replace(/\/+$/, "");

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

    const endpoint = ACTION_TO_ENDPOINT[action];
    const finalUrl = `${VPS_API_URL}/${endpoint}`;
    console.log(
      `[vps-api] User ${userId} requesting action: ${action}, endpoint: ${endpoint}, URL: ${finalUrl}`,
      params
    );

    // Build CyberPanel-compatible payload
    const bodyPayload: Record<string, unknown> = {
      adminUser: CYBERPANEL_USER,
      adminPass: CYBERPANEL_PASS,
    };

    if (action === "create-account") {
      // CyberPanel createWebsite requires: domainName, ownerEmail, packageName, websiteOwner, ownerPassword
      bodyPayload.domainName = params.domain;
      bodyPayload.ownerEmail = params.ownerEmail || `admin@${params.domain}`;
      bodyPayload.packageName = params.package || "Default";
      bodyPayload.websiteOwner = params.websiteOwner || "admin";
      bodyPayload.ownerPassword = params.ownerPassword || crypto.randomUUID().slice(0, 16);
      if (params.phpSelection) bodyPayload.phpSelection = params.phpSelection;
    } else if (action === "suspend") {
      bodyPayload.websiteName = params.domain;
      bodyPayload.state = "Suspend";
    } else if (action === "unsuspend") {
      bodyPayload.websiteName = params.domain;
      bodyPayload.state = "Activate";
    } else if (action === "delete") {
      bodyPayload.domainName = params.domain;
    } else if (action === "verify") {
      // verifyConn only needs adminUser + adminPass
    } else {
      // Pass through any extra params
      Object.assign(bodyPayload, params);
    }

    console.log(`[vps-api] Sending to CyberPanel:`, { ...bodyPayload, adminPass: "***" });

    const vpsResponse = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
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
