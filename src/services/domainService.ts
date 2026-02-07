import { supabase } from "@/integrations/supabase/client";

type NameSiloAction =
  | "checkAvailability"
  | "registerDomain"
  | "renewDomain"
  | "getDNSRecords"
  | "addDNSRecord"
  | "deleteDNSRecord"
  | "changeNameservers";

async function callNameSiloApi(action: NameSiloAction, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("namesilo-api", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "NameSilo API call failed");
  return data;
}

export async function checkDomainAvailability(domain: string) {
  return callNameSiloApi("checkAvailability", { domain });
}

export async function registerDomain(domain: string, years = 1) {
  return callNameSiloApi("registerDomain", { domain, years });
}

export async function renewDomain(domain: string, years = 1) {
  return callNameSiloApi("renewDomain", { domain, years });
}

export async function getDNSRecords(domain: string) {
  return callNameSiloApi("getDNSRecords", { domain });
}

export async function addDNSRecord(
  domain: string,
  type: string,
  host: string,
  value: string,
  ttl = 3600
) {
  return callNameSiloApi("addDNSRecord", { domain, type, host, value, ttl });
}

export async function deleteDNSRecord(domain: string, recordId: string) {
  return callNameSiloApi("deleteDNSRecord", { domain, record_id: recordId });
}

export async function changeNameservers(
  domain: string,
  nameservers: { ns1: string; ns2: string; ns3?: string; ns4?: string }
) {
  return callNameSiloApi("changeNameservers", { domain, ...nameservers });
}

export async function processOrder(orderId: string) {
  const { data, error } = await supabase.functions.invoke("process-order", {
    body: { order_id: orderId },
  });
  if (error) throw new Error(error.message || "Order processing failed");
  return data;
}
