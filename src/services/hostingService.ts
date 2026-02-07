import { supabase } from "@/integrations/supabase/client";

type VpsAction =
  | "create-account"
  | "suspend"
  | "unsuspend"
  | "delete"
  | "verify";

export async function callVpsApi(action: VpsAction, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("vps-api", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "VPS API call failed");
  return data;
}

export async function createHostingAccount(
  domain: string,
  packageName: string,
  ownerEmail?: string,
  websiteOwner?: string
) {
  return callVpsApi("create-account", {
    domain,
    package: packageName,
    ownerEmail,
    websiteOwner,
  });
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

export async function verifyConnection() {
  return callVpsApi("verify");
}

export async function checkDns(domain: string, hostingAccountId?: string) {
  const { data, error } = await supabase.functions.invoke("check-dns", {
    body: { domain, hosting_account_id: hostingAccountId },
  });
  if (error) throw new Error(error.message || "DNS check failed");
  return data;
}
