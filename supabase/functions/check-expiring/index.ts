import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REMINDER_DAYS = [14, 7, 3, 1]; // Send reminders at these days before expiry

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const results: Array<{ domain: string; daysLeft: number; sent: boolean; error?: string }> = [];

    for (const days of REMINDER_DAYS) {
      // Find accounts expiring in exactly `days` days (within a 24h window)
      const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const windowStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000).toISOString();

      const { data: accounts, error } = await serviceClient
        .from("hosting_accounts")
        .select("id, domain, user_id, expires_at")
        .eq("status", "active")
        .not("expires_at", "is", null)
        .gte("expires_at", windowStart)
        .lt("expires_at", windowEnd);

      if (error) {
        console.error(`[check-expiring] Error fetching accounts expiring in ${days} days:`, error);
        continue;
      }

      console.log(`[check-expiring] Found ${accounts?.length || 0} accounts expiring in ~${days} days`);

      for (const account of accounts || []) {
        try {
          const { data: profile } = await serviceClient
            .from("profiles")
            .select("email, first_name")
            .eq("user_id", account.user_id)
            .maybeSingle();

          if (!profile?.email) continue;

          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: profile.email,
              type: "expiring",
              data: {
                firstName: profile.first_name,
                domain: account.domain,
                expiresAt: new Date(account.expires_at).toLocaleDateString(),
                daysLeft: days,
                dashboardUrl: "https://vintechdev.store/dashboard/billing",
              },
            }),
          });

          console.log(`[check-expiring] Expiry reminder sent to ${profile.email} for ${account.domain} (${days} days)`);
          results.push({ domain: account.domain, daysLeft: days, sent: true });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          console.error(`[check-expiring] Failed to send reminder for ${account.domain}:`, errMsg);
          results.push({ domain: account.domain, daysLeft: days, sent: false, error: errMsg });
        }
      }
    }

    console.log(`[check-expiring] Completed. Sent ${results.filter((r) => r.sent).length} reminders`);

    return new Response(
      JSON.stringify({ success: true, reminders_sent: results.filter((r) => r.sent).length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-expiring] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
