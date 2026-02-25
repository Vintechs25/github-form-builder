

## Add API Key Management to Admin API Panel

### Problem
The Configure dialog currently shows Base URL and Health Check URL fields, but APIs like NameSilo, Paystack, Coolify, and Resend require **API keys/secrets** to function. Admins need to see which secrets each API requires and be able to update them from the panel.

### Solution

**1. Create a new edge function `manage-secrets`** that allows admins to:
- Check if a secret is configured (returns true/false, never the value)
- Update a secret's value securely

This edge function will use the Supabase Management API to set vault secrets. It will verify the caller is an admin before proceeding.

**2. Define an API-to-secrets mapping** in the frontend that maps each `api_name` to its required secret(s):

| API Name | Required Secret(s) |
|----------|-------------------|
| `coolify-api` | `COOLIFY_API_TOKEN` |
| `paystack` | `PAYSTACK_SECRET_KEY` |
| `namesilo-api` | `NAMESILO_API_KEY` |
| `send-notification-email` | `RESEND_API_KEY` |
| `vps-api` | `COOLIFY_API_TOKEN` (shared with Coolify) |

APIs like `admin-actions`, `check-dns`, `auto-suspend`, `check-expiring`, and `process-order` are internal-only (they use `SUPABASE_SERVICE_ROLE_KEY` which is auto-configured) -- these will show "No API key required" in the dialog.

**3. Update the Configure dialog** (`AdminApiManagement.tsx`) to:
- Remove the Base URL field (as requested)
- Show "API Key" input fields for each required secret, with a masked (password-type) input
- Show a green checkmark or red warning indicating if the secret is currently set
- Include a "Update Key" button per secret
- Keep Health Check URL, rate limit, timeout, and retry fields

**4. Update the API cards** in both Grid and Table views to show a small indicator (key icon with green/red dot) showing whether the required API key is configured.

### Technical Details

**New edge function: `supabase/functions/manage-secrets/index.ts`**
- POST with `{ action: "check", secret_name: "..." }` -- returns `{ configured: true/false }`
- POST with `{ action: "set", secret_name: "..." , value: "..." }` -- sets the secret via `Deno.env` isn't persistent, so we'll store it in a secure `api_secrets` approach. Actually, since Supabase secrets are set at deploy time, the practical approach is to store encrypted API keys in the `config` jsonb column of `api_configurations` and have edge functions check there first, falling back to env vars.

**Revised approach -- store keys in `api_configurations.config` jsonb:**
- The config dialog writes the API key into the `config` column (e.g., `{ "api_key": "sk_live_..." }`)
- Edge functions are updated to check `api_configurations.config.api_key` first, then fall back to `Deno.env.get()`
- This keeps keys in the database (encrypted at rest by Supabase) and allows runtime updates without redeployment

**Files to modify:**
- `src/pages/admin/AdminApiManagement.tsx` -- Add API key fields to config dialog, remove base URL, add key status indicators
- `supabase/functions/coolify-api/index.ts` -- Add fallback to read key from DB config
- `supabase/functions/paystack/index.ts` -- Same
- `supabase/functions/namesilo-api/index.ts` -- Same
- `supabase/functions/send-notification-email/index.ts` -- Same
- `supabase/functions/vps-api/index.ts` -- Same
- `supabase/functions/process-order/index.ts` -- Same (for NameSilo key)

**Edge function key resolution pattern:**
```typescript
// Helper: resolve API key from DB config or env var
async function resolveApiKey(supabase, apiName: string, envVarName: string): Promise<string | null> {
  const { data } = await supabase
    .from("api_configurations")
    .select("config")
    .eq("api_name", apiName)
    .single();
  const dbKey = data?.config?.api_key;
  return dbKey || Deno.env.get(envVarName) || null;
}
```

This lets admins enter/update API keys from the panel and have them take effect immediately without needing to redeploy functions or access backend settings directly.

