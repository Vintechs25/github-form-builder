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
    const results: Array<{ name: string; type: string; daysLeft: number; sent: boolean; error?: string }> = [];

    // ─── CHECK HOSTING ACCOUNTS ────────────────────────────────────
    for (const days of REMINDER_DAYS) {
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

      if (error) { console.error(`[check-expiring] Error hosting ${days}d:`, error); continue; }
      console.log(`[check-expiring] ${accounts?.length || 0} hosting accounts expiring in ~${days} days`);

      for (const account of accounts || []) {
        try {
          const { data: profile } = await serviceClient.from("profiles").select("email, first_name").eq("user_id", account.user_id).maybeSingle();
          if (!profile?.email) continue;
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ to: profile.email, type: "expiring", data: { firstName: profile.first_name, domain: account.domain, expiresAt: new Date(account.expires_at).toLocaleDateString(), daysLeft: days, dashboardUrl: "https://vintechdev.store/dashboard/billing" } }),
          });
          console.log(`[check-expiring] Hosting expiry reminder sent to ${profile.email} for ${account.domain} (${days}d)`);
          results.push({ name: account.domain, type: "hosting", daysLeft: days, sent: true });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          results.push({ name: account.domain, type: "hosting", daysLeft: days, sent: false, error: errMsg });
        }
      }
    }

    // ─── CHECK DOMAINS ─────────────────────────────────────────────
    for (const days of REMINDER_DAYS) {
      const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const windowStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000).toISOString();

      const { data: domains, error } = await serviceClient
        .from("domains")
        .select("id, domain_name, user_id, expires_at")
        .eq("status", "active")
        .not("expires_at", "is", null)
        .gte("expires_at", windowStart)
        .lt("expires_at", windowEnd);

      if (error) { console.error(`[check-expiring] Error domains ${days}d:`, error); continue; }
      console.log(`[check-expiring] ${domains?.length || 0} domains expiring in ~${days} days`);

      for (const domain of domains || []) {
        try {
          const { data: profile } = await serviceClient.from("profiles").select("email, first_name").eq("user_id", domain.user_id).maybeSingle();
          if (!profile?.email) continue;
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ to: profile.email, type: "domain_expiring", data: { firstName: profile.first_name, domainName: domain.domain_name, expiresAt: new Date(domain.expires_at).toLocaleDateString(), daysLeft: days } }),
          });
          console.log(`[check-expiring] Domain expiry reminder sent to ${profile.email} for ${domain.domain_name} (${days}d)`);
          results.push({ name: domain.domain_name, type: "domain", daysLeft: days, sent: true });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          results.push({ name: domain.domain_name, type: "domain", daysLeft: days, sent: false, error: errMsg });
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
