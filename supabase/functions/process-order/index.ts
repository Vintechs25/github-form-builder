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

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[process-order] Processing order ${order_id}, type=${order.type}`);

    const results: Record<string, unknown> = { order_id };

    if (order.type === "hosting") {
      // Provision hosting via VPS API
      const VPS_API_KEY = Deno.env.get("VPS_API_KEY");
      const VPS_API_URL =
        Deno.env.get("VPS_API_URL") || "https://panel.vin-tech.top/api";

      if (!VPS_API_KEY) {
        console.error("[process-order] VPS_API_KEY not configured");
        results.hosting = { error: "VPS API not configured" };
      } else {
        try {
          // Get package details
          let packageSlug = "starter";
          if (order.package_id) {
            const { data: plan } = await serviceClient
              .from("hosting_plans")
              .select("slug")
              .eq("id", order.package_id)
              .single();
            if (plan) packageSlug = plan.slug;
          }

          const vpsRes = await fetch(`${VPS_API_URL}/create-account`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${VPS_API_KEY}`,
            },
            body: JSON.stringify({
              user_id: userId,
              domain: order.domain_name || `user-${userId.substring(0, 8)}.vin-tech.top`,
              package: packageSlug,
            }),
          });

          const vpsText = await vpsRes.text();
          let vpsData;
          try {
            vpsData = JSON.parse(vpsText);
          } catch {
            vpsData = { raw: vpsText };
          }

          console.log("[process-order] VPS create-account response:", vpsData);

          if (vpsRes.ok) {
            // Create hosting account record
            await serviceClient.from("hosting_accounts").insert({
              user_id: userId,
              plan_id: order.package_id,
              domain: order.domain_name || `user-${userId.substring(0, 8)}.vin-tech.top`,
              status: "active",
              cpanel_username: vpsData.username || null,
              ftp_username: vpsData.ftp_username || null,
            });

            // Issue SSL
            await fetch(`${VPS_API_URL}/ssl`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${VPS_API_KEY}`,
              },
              body: JSON.stringify({
                domain: order.domain_name,
                user_id: userId,
              }),
            });

            results.hosting = { success: true, data: vpsData };
          } else {
            results.hosting = { error: "VPS provisioning failed", details: vpsData };
          }
        } catch (err) {
          console.error("[process-order] VPS error:", err);
          results.hosting = {
            error: err instanceof Error ? err.message : "VPS error",
          };
        }
      }
    }

    if (order.type === "domain") {
      // Register domain via NameSilo
      const NAMESILO_API_KEY = Deno.env.get("NAMESILO_API_KEY");

      if (!NAMESILO_API_KEY) {
        console.error("[process-order] NAMESILO_API_KEY not configured");
        results.domain = { error: "NameSilo API not configured" };
      } else if (order.domain_name) {
        try {
          const nsUrl = new URL(
            "https://www.namesilo.com/api/registerDomain"
          );
          nsUrl.searchParams.set("version", "1");
          nsUrl.searchParams.set("type", "xml");
          nsUrl.searchParams.set("key", NAMESILO_API_KEY);
          nsUrl.searchParams.set("domain", order.domain_name);
          nsUrl.searchParams.set("years", "1");
          nsUrl.searchParams.set("private", "1");
          nsUrl.searchParams.set("auto_renew", "0");

          const nsRes = await fetch(nsUrl.toString());
          const nsText = await nsRes.text();
          const codeMatch = nsText.match(/<code>(\d+)<\/code>/);
          const code = codeMatch ? codeMatch[1] : null;

          console.log(
            `[process-order] NameSilo register response: code=${code}`
          );

          if (code === "300") {
            await serviceClient.from("domains").insert({
              user_id: userId,
              domain_name: order.domain_name,
              domain_type: "registered",
              registrar: "namesilo",
              status: "active",
              expires_at: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000
              ).toISOString(),
            });
            results.domain = { success: true };
          } else {
            results.domain = { error: "Domain registration failed", code };
          }
        } catch (err) {
          console.error("[process-order] NameSilo error:", err);
          results.domain = {
            error: err instanceof Error ? err.message : "NameSilo error",
          };
        }
      }
    }

    // Update order status to completed
    await serviceClient
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order_id);

    console.log(`[process-order] Order ${order_id} completed`, results);

    return new Response(
      JSON.stringify({ success: true, data: results }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
