import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Resolve an API key from the api_configurations.config jsonb column,
 * falling back to a Deno environment variable.
 */
export async function resolveApiKey(
  apiName: string,
  secretKey: string,
  envVarName: string
): Promise<string | null> {
  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await adminClient
      .from("api_configurations")
      .select("config")
      .eq("api_name", apiName)
      .maybeSingle();

    const config = data?.config as Record<string, unknown> | null;
    const dbKey = config?.[secretKey] as string | undefined;
    if (dbKey) return dbKey;
  } catch (err) {
    console.error(`[resolveApiKey] Error reading config for ${apiName}:`, err);
  }
  return Deno.env.get(envVarName) || null;
}
