import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { api_name } = await req.json().catch(() => ({}));

    // Fetch APIs to check – either one specific or all with health_check_url
    let query = supabase
      .from("api_configurations")
      .select("id, api_name, display_name, health_check_url, is_enabled");

    if (api_name) {
      query = query.eq("api_name", api_name);
    } else {
      query = query.not("health_check_url", "is", null);
    }

    const { data: apis, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!apis || apis.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "No APIs with health check URLs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const api of apis) {
      if (!api.health_check_url) {
        results.push({
          api_name: api.api_name,
          status: "no_url",
          message: "No health check URL configured",
        });
        continue;
      }

      let status = "unknown";
      let responseTime = 0;
      let message = "";
      let statusCode = 0;

      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(api.health_check_url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        responseTime = Date.now() - start;
        statusCode = res.status;

        if (res.ok) {
          status = "healthy";
          message = `OK (${statusCode}) in ${responseTime}ms`;
        } else {
          status = "degraded";
          message = `HTTP ${statusCode} in ${responseTime}ms`;
        }
      } catch (err) {
        status = "down";
        message = err.name === "AbortError" ? "Timeout after 10s" : String(err.message || err);
      }

      // Update the database
      await supabase
        .from("api_configurations")
        .update({
          health_status: status,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", api.id);

      results.push({
        api_name: api.api_name,
        display_name: api.display_name,
        status,
        response_time_ms: responseTime,
        status_code: statusCode,
        message,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
