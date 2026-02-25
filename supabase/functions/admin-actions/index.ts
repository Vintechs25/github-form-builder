import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ─── API Gate Check ─────────────────────────────────────────────
  const gateClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: apiConfig } = await gateClient
    .from("api_configurations")
    .select("is_enabled")
    .eq("api_name", "admin-actions")
    .maybeSingle();
  if (apiConfig && !apiConfig.is_enabled) {
    return json({ error: "Admin Actions API is currently disabled by administrator" }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Verify caller is admin
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  // Use service role for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check admin role
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) return json({ error: "Admin access required" }, 403);

  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "create-user": {
        const { email, password, first_name, last_name } = params;
        if (!email || !password) return json({ error: "Email and password required" }, 400);

        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { first_name, last_name },
        });

        if (error) return json({ error: error.message }, 400);
        return json({ success: true, user_id: newUser.user?.id });
      }

      case "delete-user": {
        const { user_id } = params;
        if (!user_id) return json({ error: "user_id required" }, 400);

        // Delete all user data first
        await supabaseAdmin.from("hosting_accounts").delete().eq("user_id", user_id);
        await supabaseAdmin.from("invoices").delete().eq("user_id", user_id);
        await supabaseAdmin.from("orders").delete().eq("user_id", user_id);
        await supabaseAdmin.from("domains").delete().eq("user_id", user_id);
        await supabaseAdmin.from("support_tickets").delete().eq("user_id", user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      case "reset-password": {
        const { user_id, new_password } = params;
        if (!user_id || !new_password) return json({ error: "user_id and new_password required" }, 400);

        const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          password: new_password,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      case "force-logout": {
        const { user_id } = params;
        if (!user_id) return json({ error: "user_id required" }, 400);

        // Sign out all sessions
        const { error } = await supabaseAdmin.auth.admin.signOut(user_id, "global");
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("admin-actions error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
