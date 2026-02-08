import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── UNSUSPEND HELPER ─────────────────────────────────────────────
async function unsuspendIfNeeded(serviceClient: any, invoice: any) {
  // Check hosting account directly linked to invoice
  let accountId = invoice.hosting_account_id;

  // If no direct link, check via order's domain
  if (!accountId && invoice.order_id) {
    const { data: order } = await serviceClient
      .from("orders")
      .select("domain_name")
      .eq("id", invoice.order_id)
      .maybeSingle();

    if (order?.domain_name) {
      const { data: acct } = await serviceClient
        .from("hosting_accounts")
        .select("id, status")
        .eq("domain", order.domain_name)
        .eq("user_id", invoice.user_id)
        .eq("status", "suspended")
        .maybeSingle();
      if (acct) accountId = acct.id;
    }
  }

  if (!accountId) return;

  // Check if account is suspended
  const { data: account } = await serviceClient
    .from("hosting_accounts")
    .select("id, domain, status")
    .eq("id", accountId)
    .eq("status", "suspended")
    .maybeSingle();

  if (!account) return;

  console.log(`[paystack] Unsuspending hosting for ${account.domain} (account ${account.id})`);

  const CYBERPANEL_USER = Deno.env.get("CYBERPANEL_USER");
  const CYBERPANEL_PASS = Deno.env.get("CYBERPANEL_PASS");
  let VPS_API_URL = Deno.env.get("VPS_API_URL") || "https://panel.vintechcyber.com:8090/api";
  if (!/^https?:\/\//i.test(VPS_API_URL)) VPS_API_URL = `http://${VPS_API_URL}`;
  VPS_API_URL = VPS_API_URL.replace(/\/+$/, "");

  if (!CYBERPANEL_USER || !CYBERPANEL_PASS) {
    console.error("[paystack] CyberPanel credentials not configured, cannot unsuspend");
    return;
  }

  try {
    const vpsRes = await fetch(`${VPS_API_URL}/submitWebsiteStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUser: CYBERPANEL_USER,
        adminPass: CYBERPANEL_PASS,
        websiteName: account.domain,
        state: "Unsuspend",
      }),
    });

    const vpsText = await vpsRes.text();
    let vpsData: any;
    try { vpsData = JSON.parse(vpsText); } catch { vpsData = { raw: vpsText }; }
    console.log(`[paystack] CyberPanel unsuspend response for ${account.domain}:`, vpsData);

    // Update hosting account status back to active
    await serviceClient
      .from("hosting_accounts")
      .update({ status: "active" })
      .eq("id", account.id);

    console.log(`[paystack] Hosting ${account.domain} unsuspended successfully`);
  } catch (err) {
    console.error(`[paystack] Failed to unsuspend ${account.domain}:`, err);
  }
}

// ─── MARK PAID + UNSUSPEND HELPER ─────────────────────────────────
async function markInvoicePaidAndUnsuspend(
  serviceClient: any,
  invoice: any,
  reference: string
) {
  await serviceClient
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_gateway: "paystack",
    })
    .eq("id", invoice.id);

  // Record transaction
  await serviceClient.from("transactions").insert({
    user_id: invoice.user_id,
    invoice_id: invoice.id,
    amount: invoice.amount,
    method: "paystack",
    reference,
  });

  // Unsuspend hosting if it was suspended
  await unsuspendIfNeeded(serviceClient, invoice);

  // Process order if linked
  if (invoice.order_id) {
    await serviceClient
      .from("orders")
      .update({ status: "paid" })
      .eq("id", invoice.order_id);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/functions/v1/process-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ order_id: invoice.order_id }),
      });
    } catch (err) {
      console.error("[paystack] Error triggering process-order:", err);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      console.error("[paystack] PAYSTACK_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Paystack not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1] || "";

    // ─── WEBHOOK (no auth required) ─────────────────────────────────
    if (action === "webhook") {
      const body = await req.text();
      const sig = req.headers.get("x-paystack-signature") || "";

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(PAYSTACK_SECRET_KEY),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const expectedSig = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (sig !== expectedSig) {
        console.error("[paystack] Invalid webhook signature");
        return new Response("Invalid signature", { status: 400 });
      }

      const event = JSON.parse(body);
      console.log(`[paystack] Webhook event: ${event.event}`, event.data?.reference);

      if (event.event === "charge.success") {
        const reference = event.data?.reference;
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: invoice } = await serviceClient
          .from("invoices")
          .select("*")
          .eq("payment_reference", reference)
          .in("status", ["unpaid", "overdue"])
          .maybeSingle();

        if (invoice) {
          console.log(`[paystack] Marking invoice ${invoice.id} as paid via webhook`);
          await markInvoicePaidAndUnsuspend(serviceClient, invoice, reference);
        }
      }

      return new Response("ok", { status: 200 });
    }

    // ─── AUTHENTICATED ACTIONS ──────────────────────────────────────
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // ─── INITIALIZE TRANSACTION ─────────────────────────────────────
    if (action === "initialize") {
      const { invoice_id, callback_url } = body;
      if (!invoice_id) {
        return new Response(JSON.stringify({ error: "invoice_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice_id)
        .single();

      if (invErr || !invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (invoice.status === "paid") {
        return new Response(JSON.stringify({ error: "Invoice already paid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amountInSmallest = Math.round(Number(invoice.amount) * 100);
      const reference = `INV-${invoice.invoice_number}-${Date.now()}`;

      const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountInSmallest,
          currency: invoice.currency || "KES",
          reference,
          callback_url: callback_url || undefined,
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            user_id: user.id,
          },
        }),
      });

      const paystackData = await paystackRes.json();
      console.log(`[paystack] Initialize response:`, paystackData.status, reference);

      if (!paystackData.status) {
        return new Response(JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient
        .from("invoices")
        .update({ payment_reference: reference, payment_gateway: "paystack" })
        .eq("id", invoice.id);

      return new Response(
        JSON.stringify({
          success: true,
          authorization_url: paystackData.data.authorization_url,
          reference,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── VERIFY TRANSACTION ─────────────────────────────────────────
    if (action === "verify") {
      const { reference } = body;
      if (!reference) {
        return new Response(JSON.stringify({ error: "reference is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const paystackData = await paystackRes.json();
      console.log(`[paystack] Verify response for ${reference}:`, paystackData.data?.status);

      const paid = paystackData.data?.status === "success";

      if (paid) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: invoice } = await serviceClient
          .from("invoices")
          .select("*")
          .eq("payment_reference", reference)
          .maybeSingle();

        if (invoice && invoice.status !== "paid") {
          await markInvoicePaidAndUnsuspend(serviceClient, invoice, reference);
        }
      }

      return new Response(
        JSON.stringify({ success: true, paid, data: paystackData.data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: initialize, verify, webhook" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[paystack] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
