import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OVERDUE_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const CYBERPANEL_USER = Deno.env.get("CYBERPANEL_USER");
    const CYBERPANEL_PASS = Deno.env.get("CYBERPANEL_PASS");
    let VPS_API_URL = Deno.env.get("VPS_API_URL") || "https://panel.vintechcyber.com:8090/api";
    if (!/^https?:\/\//i.test(VPS_API_URL)) VPS_API_URL = `http://${VPS_API_URL}`;
    VPS_API_URL = VPS_API_URL.replace(/\/+$/, "");

    if (!CYBERPANEL_USER || !CYBERPANEL_PASS) {
      console.error("[auto-suspend] CyberPanel credentials not configured");
      return new Response(JSON.stringify({ error: "CyberPanel not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate the cutoff date (7 days ago)
    const cutoff = new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    console.log(`[auto-suspend] Checking for unpaid invoices due before ${cutoff}`);

    // Find unpaid/overdue invoices past the grace period that have a linked hosting account
    const { data: overdueInvoices, error: fetchErr } = await serviceClient
      .from("invoices")
      .select("id, user_id, hosting_account_id, invoice_number, due_date, order_id")
      .in("status", ["unpaid", "overdue"])
      .lt("due_date", cutoff)
      .not("hosting_account_id", "is", null);

    if (fetchErr) {
      console.error("[auto-suspend] Error fetching invoices:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also find invoices linked via orders (hosting_account_id might be null but order links to hosting)
    const { data: orderInvoices, error: orderFetchErr } = await serviceClient
      .from("invoices")
      .select("id, user_id, order_id, invoice_number, due_date")
      .in("status", ["unpaid", "overdue"])
      .lt("due_date", cutoff)
      .is("hosting_account_id", null)
      .not("order_id", "is", null);

    if (orderFetchErr) {
      console.error("[auto-suspend] Error fetching order invoices:", orderFetchErr);
    }

    // Build a map of hosting accounts to suspend
    const accountsToSuspend = new Map<string, { domain: string; invoiceId: string; userId: string }>();

    // Direct hosting_account_id links
    if (overdueInvoices?.length) {
      const accountIds = [...new Set(overdueInvoices.map((i) => i.hosting_account_id!))];
      const { data: accounts } = await serviceClient
        .from("hosting_accounts")
        .select("id, domain, status")
        .in("id", accountIds)
        .eq("status", "active");

      for (const acct of accounts || []) {
        const inv = overdueInvoices.find((i) => i.hosting_account_id === acct.id)!;
        accountsToSuspend.set(acct.id, { domain: acct.domain, invoiceId: inv.id, userId: inv.user_id });
      }
    }

    // Order-linked invoices: find hosting accounts via order's domain_name
    if (orderInvoices?.length) {
      for (const inv of orderInvoices) {
        const { data: order } = await serviceClient
          .from("orders")
          .select("domain_name")
          .eq("id", inv.order_id!)
          .maybeSingle();

        if (order?.domain_name) {
          const { data: acct } = await serviceClient
            .from("hosting_accounts")
            .select("id, domain, status")
            .eq("domain", order.domain_name)
            .eq("user_id", inv.user_id)
            .eq("status", "active")
            .maybeSingle();

          if (acct) {
            accountsToSuspend.set(acct.id, { domain: acct.domain, invoiceId: inv.id, userId: inv.user_id });
          }
        }
      }
    }

    console.log(`[auto-suspend] Found ${accountsToSuspend.size} active accounts to suspend`);

    const results: Array<{ account_id: string; domain: string; success: boolean; error?: string }> = [];

    for (const [accountId, { domain, invoiceId, userId }] of accountsToSuspend) {
      try {
        console.log(`[auto-suspend] Suspending ${domain} (account ${accountId})`);

        // Call CyberPanel submitWebsiteStatus to suspend
        const vpsRes = await fetch(`${VPS_API_URL}/submitWebsiteStatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminUser: CYBERPANEL_USER,
            adminPass: CYBERPANEL_PASS,
            websiteName: domain,
            state: "Suspend",
          }),
        });

        const vpsText = await vpsRes.text();
        let vpsData: any;
        try { vpsData = JSON.parse(vpsText); } catch { vpsData = { raw: vpsText }; }
        console.log(`[auto-suspend] CyberPanel response for ${domain}:`, vpsData);

        // Update hosting account status to suspended
        await serviceClient
          .from("hosting_accounts")
          .update({ status: "suspended" })
          .eq("id", accountId);

        // Mark invoice as overdue if still unpaid
        await serviceClient
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", invoiceId)
          .eq("status", "unpaid");

        // Send suspension email
        try {
          const { data: profile } = await serviceClient
            .from("profiles")
            .select("email, first_name")
            .eq("user_id", userId)
            .maybeSingle();

          if (profile?.email) {
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
                type: "suspension",
                data: {
                  domain,
                  firstName: profile.first_name,
                  dashboardUrl: "https://vintechdev.store/dashboard/billing",
                },
              }),
            });
            console.log(`[auto-suspend] Suspension email sent to ${profile.email} for ${domain}`);
          }
        } catch (emailErr) {
          console.error(`[auto-suspend] Failed to send suspension email for ${domain}:`, emailErr);
        }

        results.push({ account_id: accountId, domain, success: true });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[auto-suspend] Failed to suspend ${domain}:`, errMsg);
        results.push({ account_id: accountId, domain, success: false, error: errMsg });
      }
    }

    console.log(`[auto-suspend] Completed. Suspended: ${results.filter((r) => r.success).length}/${results.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: (overdueInvoices?.length || 0) + (orderInvoices?.length || 0),
        suspended: results.filter((r) => r.success).length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[auto-suspend] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
