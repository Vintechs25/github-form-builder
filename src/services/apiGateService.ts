import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a specific API is enabled in the admin panel.
 * Returns true if enabled or if the config doesn't exist (fail-open for missing entries).
 */
export async function isApiEnabled(apiName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("api_configurations")
    .select("is_enabled")
    .eq("api_name", apiName)
    .maybeSingle();

  // If no config found or error, default to enabled (fail-open)
  if (error || !data) return true;
  return data.is_enabled;
}

/**
 * Assert that an API is enabled, throwing a user-friendly error if disabled.
 */
export async function assertApiEnabled(apiName: string, displayName: string): Promise<void> {
  const enabled = await isApiEnabled(apiName);
  if (!enabled) {
    throw new Error(`${displayName} is currently disabled by the administrator. Please try again later or contact support.`);
  }
}

/**
 * Get all API configurations (for admin dashboard or status display).
 */
export async function getAllApiConfigs() {
  const { data, error } = await supabase
    .from("api_configurations")
    .select("api_name, display_name, is_enabled, category")
    .order("category");

  if (error) return [];
  return data || [];
}
