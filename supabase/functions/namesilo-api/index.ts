import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveApiKey } from "../_shared/resolveApiKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NAMESILO_BASE = "https://www.namesilo.com/api";

const VALID_ACTIONS = [
  "checkAvailability",
  "registerDomain",
  "renewDomain",
  "getDNSRecords",
  "addDNSRecord",
  "deleteDNSRecord",
  "changeNameservers",
  "syncPrices",
  "getPricing",
];

async function callNameSilo(
  apiKey: string,
  operation: string,
  params: Record<string, string> = {}
): Promise<string> {
  const url = new URL(`${NAMESILO_BASE}/${operation}`);
  url.searchParams.set("version", "1");
  url.searchParams.set("type", "xml");
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  console.log(`[namesilo-api] Calling: ${operation}`, params);
  const res = await fetch(url.toString());
  const text = await res.text();
  console.log(`[namesilo-api] Response for ${operation}: status=${res.status}, length=${text.length}`);
  return text;
}

function parseXmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1] : null;
}

function parseXmlArray(xml: string, tag: string): string[] {
  const matches = [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))];
  return matches.map((m) => m[1]);
}

// Parse NameSilo getPrices XML into structured pricing data
function parsePricesXml(xml: string): Array<{ tld: string; register: number; renew: number; transfer: number }> {
  const results: Array<{ tld: string; register: number; renew: number; transfer: number }> = [];
  
  // NameSilo getPrices returns XML like:
  // <com><registration>8.99</registration><renewal>8.99</renewal><transfer>8.39</transfer></com>
  const tldBlocks = xml.match(/<(\w[\w.-]*)>\s*<registration>[\s\S]*?<\/\1>/g);
  if (!tldBlocks) return results;

  for (const block of tldBlocks) {
    const tldMatch = block.match(/^<([\w.-]+)>/);
    if (!tldMatch) continue;
    const tld = tldMatch[1];
    
    // Skip non-TLD tags
    if (['reply', 'request', 'namesilo', 'detail', 'code'].includes(tld)) continue;

    const registration = parseXmlValue(block, 'registration');
    const renewal = parseXmlValue(block, 'renewal');
    const transfer = parseXmlValue(block, 'transfer');

    if (registration) {
      results.push({
        tld: `.${tld}`,
        register: parseFloat(registration),
        renew: parseFloat(renewal || registration),
        transfer: parseFloat(transfer || '0'),
      });
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ─── API Gate Check ─────────────────────────────────────────────
  const gateClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: apiConfig } = await gateClient
    .from("api_configurations")
    .select("is_enabled")
    .eq("api_name", "namesilo-api")
    .maybeSingle();
  if (apiConfig && !apiConfig.is_enabled) {
    return new Response(
      JSON.stringify({ error: "Domain Registrar API is currently disabled by administrator" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Get API key (DB config first, then env var)
    const NAMESILO_API_KEY = await resolveApiKey("namesilo-api", "NAMESILO_API_KEY", "NAMESILO_API_KEY");
    if (!NAMESILO_API_KEY) {
      console.error("NAMESILO_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "NameSilo API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();

    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Valid: ${VALID_ACTIONS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[namesilo-api] User ${userId} action: ${action}`, params);

    let result: Record<string, unknown> = {};

    switch (action) {
      case "checkAvailability": {
        const xml = await callNameSilo(NAMESILO_API_KEY, "checkRegisterAvailability", {
          domains: params.domain,
        });
        const code = parseXmlValue(xml, "code");
        const available = xml.includes("<available>");
        const price = parseXmlValue(xml, "price");
        result = { domain: params.domain, available, price: price ? parseFloat(price) : null, code };
        break;
      }

      case "getPricing": {
        // Read pricing from DB (no admin check - RLS handles visibility)
        const { data: pricing } = await supabase
          .from("domain_pricing")
          .select("*")
          .eq("is_enabled", true)
          .order("tld");
        result = { pricing: pricing || [] };
        break;
      }

      case "syncPrices": {
        // Admin-only: sync prices from NameSilo
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Check admin role
        const { data: roleCheck } = await serviceClient.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (!roleCheck) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const xml = await callNameSilo(NAMESILO_API_KEY, "getPrices");
        const prices = parsePricesXml(xml);
        console.log(`[namesilo-api] Parsed ${prices.length} TLD prices`);

        let synced = 0;
        for (const p of prices) {
          const { error } = await serviceClient.from("domain_pricing").upsert(
            {
              tld: p.tld,
              register_price: p.register,
              renew_price: p.renew,
              transfer_price: p.transfer,
              currency: "USD",
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "tld" }
          );
          if (!error) synced++;
        }

        result = { synced, total: prices.length };
        break;
      }

      case "registerDomain": {
        const registerParams: Record<string, string> = {
          domain: params.domain,
          years: String(params.years || 1),
          private: "1",
          auto_renew: "0",
          ns1: "ns1.vintechdev.store",
          ns2: "ns2.vintechdev.store",
        };

        const xml = await callNameSilo(NAMESILO_API_KEY, "registerDomain", registerParams);
        const code = parseXmlValue(xml, "code");
        const detail = parseXmlValue(xml, "detail");
        result = { domain: params.domain, success: code === "300", code, detail };

        if (code === "300") {
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await serviceClient.from("domains").insert({
            user_id: userId,
            domain_name: params.domain,
            domain_type: "registered",
            registrar: "namesilo",
            status: "active",
            nameserver_1: "ns1.vintechdev.store",
            nameserver_2: "ns2.vintechdev.store",
            expires_at: new Date(
              Date.now() + (params.years || 1) * 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        }
        break;
      }

      case "renewDomain": {
        const xml = await callNameSilo(NAMESILO_API_KEY, "renewDomain", {
          domain: params.domain,
          years: String(params.years || 1),
        });
        const code = parseXmlValue(xml, "code");
        const detail = parseXmlValue(xml, "detail");
        result = { domain: params.domain, success: code === "300", code, detail };
        break;
      }

      case "getDNSRecords": {
        const xml = await callNameSilo(NAMESILO_API_KEY, "dnsListRecords", {
          domain: params.domain,
        });
        const ids = parseXmlArray(xml, "record_id");
        const types = parseXmlArray(xml, "type");
        const hosts = parseXmlArray(xml, "host");
        const values = parseXmlArray(xml, "value");
        const ttls = parseXmlArray(xml, "ttl");

        const records = ids.map((id, i) => ({
          record_id: id,
          type: types[i] || "",
          host: hosts[i] || "",
          value: values[i] || "",
          ttl: parseInt(ttls[i] || "3600"),
        }));
        result = { domain: params.domain, records };
        break;
      }

      case "addDNSRecord": {
        const xml = await callNameSilo(NAMESILO_API_KEY, "dnsAddRecord", {
          domain: params.domain,
          rrtype: params.type,
          rrhost: params.host || "",
          rrvalue: params.value,
          rrttl: String(params.ttl || 3600),
        });
        const code = parseXmlValue(xml, "code");
        const recordId = parseXmlValue(xml, "record_id");
        result = { success: code === "300", record_id: recordId, code };
        break;
      }

      case "deleteDNSRecord": {
        const xml = await callNameSilo(NAMESILO_API_KEY, "dnsDeleteRecord", {
          domain: params.domain,
          rrid: params.record_id,
        });
        const code = parseXmlValue(xml, "code");
        result = { success: code === "300", code };
        break;
      }

      case "changeNameservers": {
        const nsParams: Record<string, string> = { domain: params.domain };
        if (params.ns1) nsParams.ns1 = params.ns1;
        if (params.ns2) nsParams.ns2 = params.ns2;
        if (params.ns3) nsParams.ns3 = params.ns3;
        if (params.ns4) nsParams.ns4 = params.ns4;

        const xml = await callNameSilo(NAMESILO_API_KEY, "changeNameServers", nsParams);
        const code = parseXmlValue(xml, "code");
        result = { success: code === "300", code };
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[namesilo-api] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
