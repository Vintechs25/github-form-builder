import { supabase } from "@/integrations/supabase/client";

type VpsAction =
  | "create-account"
  | "suspend"
  | "unsuspend"
  | "delete"
  | "create-db"
  | "create-email"
  | "ssl";

export async function callVpsApi(action: VpsAction, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("vps-api", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "VPS API call failed");
  return data;
}

export async function createHostingAccount(domain: string, packageSlug: string) {
  return callVpsApi("create-account", { domain, package: packageSlug });
}

export async function suspendHosting(domain: string) {
  return callVpsApi("suspend", { domain });
}

export async function unsuspendHosting(domain: string) {
  return callVpsApi("unsuspend", { domain });
}

export async function deleteHosting(domain: string) {
  return callVpsApi("delete", { domain });
}

export async function createDatabase(domain: string, dbName: string) {
  return callVpsApi("create-db", { domain, db_name: dbName });
}

export async function createEmail(domain: string, email: string, password: string) {
  return callVpsApi("create-email", { domain, email, password });
}

export async function issueSSL(domain: string) {
  return callVpsApi("ssl", { domain });
}
