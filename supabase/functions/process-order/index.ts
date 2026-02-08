import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try user auth first, fall back to service-role (for server-to-server calls from paystack)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    // If no user auth, fetch userId from the order itself (server-to-server call)
    if (!userId) {
      const { data: orderCheck } = await serviceClient
        .from("orders")
        .select("user_id")
        .eq("id", order_id)
        .single();
      if (orderCheck) {
        userId = orderCheck.user_id;
        console.log(`[process-order] Server-to-server call, resolved userId from order: ${userId}`);
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not resolve user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      console.error("[process-order] Order not found:", orderError);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Order is not in paid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-order] Processing order ${order_id}, type=${order.type}`);
    const results: Record<string, unknown> = { order_id };

    // ─── HOSTING ORDER ─────────────────────────────────────────────
    if (order.type === "hosting") {
      const domain = order.domain_name || `user-${userId.substring(0, 8)}.vintechdev.store`;

      // Get plan details
      let planName = "Default";
      let hostingType = "file_upload";
      if (order.package_id) {
        const { data: plan } = await serviceClient
          .from("hosting_plans")
          .select("slug, name, wordpress_enabled")
          .eq("id", order.package_id)
          .single();
        if (plan) {
          planName = plan.name || plan.slug;
          hostingType = plan.wordpress_enabled ? "wordpress" : "file_upload";
        }
      }

      // Check if hosting account already exists for this domain+user
      const { data: existingAccount } = await serviceClient
        .from("hosting_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("domain", domain)
        .maybeSingle();

      if (existingAccount) {
        // Update existing account to pending_dns (paid, waiting for DNS)
        await serviceClient
          .from("hosting_accounts")
          .update({ status: "pending_dns", plan_id: order.package_id })
          .eq("id", existingAccount.id);
        results.hosting = { success: true, status: "pending_dns", account_id: existingAccount.id };
      } else {
        // Create hosting account in pending_dns status
        // Actual CyberPanel provisioning happens via check-dns when nameservers are confirmed
        const { data: newAccount, error: insertErr } = await serviceClient
          .from("hosting_accounts")
          .insert({
            user_id: userId,
            plan_id: order.package_id,
            domain,
            status: "pending_dns",
            hosting_type: hostingType,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("[process-order] Failed to create hosting account:", insertErr);
          results.hosting = { error: insertErr.message };
        } else {
          results.hosting = { success: true, status: "pending_dns", account_id: newAccount.id };
        }
      }

      // Ensure domain record exists
      const { data: existingDomain } = await serviceClient
        .from("domains")
        .select("id")
        .eq("domain_name", domain)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingDomain) {
        await serviceClient.from("domains").insert({
          user_id: userId,
          domain_name: domain,
          domain_type: "primary",
          status: "pending",
        });
      }

      console.log(`[process-order] Hosting set to pending_dns for ${domain}`);
    }

    // ─── DOMAIN ORDER ───────────────────────────────────────────────
    if (order.type === "domain") {
      const NAMESILO_API_KEY = Deno.env.get("NAMESILO_API_KEY");

      if (!NAMESILO_API_KEY) {
        console.error("[process-order] NAMESILO_API_KEY not configured");
        results.domain = { error: "NameSilo API not configured" };
      } else if (order.domain_name) {
        try {
          const nsUrl = new URL("https://www.namesilo.com/api/registerDomain");
          nsUrl.searchParams.set("version", "1");
          nsUrl.searchParams.set("type", "xml");
          nsUrl.searchParams.set("key", NAMESILO_API_KEY);
          nsUrl.searchParams.set("domain", order.domain_name);
          nsUrl.searchParams.set("years", "1");
          nsUrl.searchParams.set("private", "1");
          nsUrl.searchParams.set("auto_renew", "0");
          // Point to our nameservers on registration
          nsUrl.searchParams.set("ns1", "ns1.vintechdev.store");
          nsUrl.searchParams.set("ns2", "ns2.vintechdev.store");

          const nsRes = await fetch(nsUrl.toString());
          const nsText = await nsRes.text();
          const codeMatch = nsText.match(/<code>(\d+)<\/code>/);
          const code = codeMatch ? codeMatch[1] : null;

          console.log(`[process-order] NameSilo register: code=${code}`);

          if (code === "300") {
            await serviceClient.from("domains").upsert({
              user_id: userId,
              domain_name: order.domain_name,
              domain_type: "registered",
              registrar: "namesilo",
              status: "active",
              nameserver_1: "ns1.vintechdev.store",
              nameserver_2: "ns2.vintechdev.store",
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: "domain_name,user_id" });
            results.domain = { success: true };
          } else {
            results.domain = { error: "Domain registration failed", code };
          }
        } catch (err) {
          console.error("[process-order] NameSilo error:", err);
          results.domain = { error: err instanceof Error ? err.message : "NameSilo error" };
        }
      }
    }

    // Update order status to completed
    await serviceClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order_id);

    // Send welcome email for hosting orders
    if (order.type === "hosting") {
      try {
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("email, first_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile?.email) {
          let planName: string | undefined;
          if (order.package_id) {
            const { data: plan } = await serviceClient
              .from("hosting_plans")
              .select("name")
              .eq("id", order.package_id)
              .maybeSingle();
            planName = plan?.name;
          }

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
              type: "welcome",
              data: {
                firstName: profile.first_name,
                domain: order.domain_name,
                planName,
              },
            }),
          });
          console.log(`[process-order] Welcome email sent to ${profile.email}`);
        }
      } catch (emailErr) {
        console.error("[process-order] Failed to send welcome email:", emailErr);
      }
    }

    console.log(`[process-order] Order ${order_id} completed`, results);

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[process-order] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
