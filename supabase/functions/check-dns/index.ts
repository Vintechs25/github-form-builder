import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUIRED_NS = ["ns1.vintechdev.store", "ns2.vintechdev.store"];

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

    const { domain, hosting_account_id } = await req.json();
    if (!domain) {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[check-dns] Checking NS for domain: ${domain}`);

    // Use Google DNS-over-HTTPS to check NS records
    const dnsUrl = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`;
    const dnsRes = await fetch(dnsUrl);
    const dnsData = await dnsRes.json();

    console.log(`[check-dns] DNS response for ${domain}:`, JSON.stringify(dnsData));

    const nsRecords: string[] = (dnsData.Answer || [])
      .filter((r: any) => r.type === 2) // NS record type
      .map((r: any) => r.data?.replace(/\.$/, "").toLowerCase());

    console.log(`[check-dns] Found NS records: ${nsRecords.join(", ")}`);

    const pointed = REQUIRED_NS.every((ns) =>
      nsRecords.includes(ns.toLowerCase())
    );

    const result = {
      domain,
      pointed,
      current_nameservers: nsRecords,
      required_nameservers: REQUIRED_NS,
    };

    // If pointed and hosting_account_id provided, activate the hosting
    if (pointed && hosting_account_id) {
      console.log(`[check-dns] NS verified for ${domain}, activating hosting ${hosting_account_id}`);

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Check hosting account belongs to user and is pending_dns
      const { data: account } = await serviceClient
        .from("hosting_accounts")
        .select("*")
        .eq("id", hosting_account_id)
        .eq("user_id", userId)
        .single();

      if (account && account.status === "pending_dns") {
        // Provision via CyberPanel
        const VPS_API_KEY = Deno.env.get("VPS_API_KEY");
        const CYBERPANEL_USER = Deno.env.get("CYBERPANEL_USER");
        const CYBERPANEL_PASS = Deno.env.get("CYBERPANEL_PASS");
        let VPS_API_URL = Deno.env.get("VPS_API_URL") || "https://panel.vintechcyber.com:8090/api";
        if (!/^https?:\/\//i.test(VPS_API_URL)) VPS_API_URL = `http://${VPS_API_URL}`;
        VPS_API_URL = VPS_API_URL.replace(/\/+$/, "");

        if (CYBERPANEL_USER && CYBERPANEL_PASS) {
          try {
            // Get package name from plan
            let packageName = "Default";
            if (account.plan_id) {
              const { data: plan } = await serviceClient
                .from("hosting_plans")
                .select("slug, name")
                .eq("id", account.plan_id)
                .single();
              if (plan) packageName = plan.name || plan.slug;
            }

            console.log(`[check-dns] Provisioning website ${domain} with package ${packageName}`);

            const vpsRes = await fetch(`${VPS_API_URL}/createWebsite`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                adminUser: CYBERPANEL_USER,
                adminPass: CYBERPANEL_PASS,
                domainName: domain,
                ownerEmail: `admin@${domain}`,
                packageName,
                websiteOwner: "admin",
                ownerPassword: crypto.randomUUID().slice(0, 16),
              }),
            });

            const vpsText = await vpsRes.text();
            let vpsData;
            try { vpsData = JSON.parse(vpsText); } catch { vpsData = { raw: vpsText }; }
            console.log(`[check-dns] CyberPanel createWebsite response:`, vpsData);

            if (vpsRes.ok) {
              // Issue SSL
              try {
                await fetch(`${VPS_API_URL}/issueSSL`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    adminUser: CYBERPANEL_USER,
                    adminPass: CYBERPANEL_PASS,
                    domainName: domain,
                  }),
                });
              } catch (sslErr) {
                console.error(`[check-dns] SSL issue error (non-fatal):`, sslErr);
              }

              // Update hosting account to active
              await serviceClient
                .from("hosting_accounts")
                .update({
                  status: "active",
                  ssl_enabled: true,
                  cpanel_username: vpsData.username || null,
                })
                .eq("id", hosting_account_id);

              // Update related domain nameservers
              await serviceClient
                .from("domains")
                .update({
                  nameserver_1: REQUIRED_NS[0],
                  nameserver_2: REQUIRED_NS[1],
                  status: "active",
                })
                .eq("domain_name", domain)
                .eq("user_id", userId);

              (result as any).provisioned = true;
              (result as any).hosting_status = "active";
            } else {
              console.error(`[check-dns] CyberPanel provisioning failed:`, vpsData);
              (result as any).provisioned = false;
              (result as any).provision_error = vpsData;
            }
          } catch (err) {
            console.error(`[check-dns] Provisioning error:`, err);
            (result as any).provisioned = false;
            (result as any).provision_error = err instanceof Error ? err.message : "Unknown error";
          }
        } else {
          console.error("[check-dns] CyberPanel credentials not configured");
        }
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[check-dns] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
