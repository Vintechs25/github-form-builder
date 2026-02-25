import { supabase } from "@/integrations/supabase/client";
import { assertApiEnabled } from "@/services/apiGateService";
// ─── Types ──────────────────────────────────────────────────────────────────
type VpsAction =
  // Official API
  | "verify"
  | "create-website"
  | "delete-website"
  | "website-status"
  | "issue-ssl"
  | "list-packages"
  | "change-package"
  | "get-user-info"
  // Database
  | "list-databases"
  | "create-database"
  | "delete-database"
  // Email
  | "list-emails"
  | "create-email"
  | "delete-email"
  | "change-email-password"
  // DNS
  | "create-dns-zone"
  | "add-dns-record"
  | "delete-dns-record"
  | "list-dns-records"
  | "delete-dns-zone"
  // Backup
  | "create-backup"
  | "list-backups"
  | "restore-backup"
  | "delete-backup"
  // File Manager
  | "list-files"
  | "create-file"
  | "create-folder"
  | "delete-file"
  | "rename-file"
  | "read-file"
  | "write-file";

// ─── Core API call ──────────────────────────────────────────────────────────
export async function callVpsApi(action: VpsAction, params: Record<string, unknown> = {}) {
  await assertApiEnabled("vps-api", "Server Management");
  const { data, error } = await supabase.functions.invoke("vps-api", {
    body: { action, ...params },
  });
  if (error) {
    // supabase.functions.invoke sets data=null on non-2xx; try reading error context
    let msg = "API call failed";
    try {
      if ('context' in error && (error as any).context?.body) {
        const body = await (error as any).context.json();
        msg = body?.error || msg;
      } else {
        msg = error.message || msg;
      }
    } catch {
      msg = error.message || msg;
    }
    throw new Error(msg);
  }
  if (data && data.error) {
    throw new Error(data.error);
  }
  return data;
}

// ─── Website / Hosting ──────────────────────────────────────────────────────
export async function createHostingAccount(
  domain: string,
  packageName: string,
  ownerEmail?: string,
  websiteOwner?: string
) {
  return callVpsApi("create-website", { domain, package: packageName, ownerEmail, websiteOwner });
}

export async function deleteHosting(domain: string) {
  return callVpsApi("delete-website", { domain });
}

export async function suspendHosting(domain: string) {
  return callVpsApi("website-status", { domain, state: "Suspend" });
}

export async function unsuspendHosting(domain: string) {
  return callVpsApi("website-status", { domain, state: "Activate" });
}

export async function verifyConnection() {
  return callVpsApi("verify");
}

export async function issueSSL(domain: string) {
  return callVpsApi("issue-ssl", { domain });
}

// ─── Databases ──────────────────────────────────────────────────────────────
export async function listDatabases(domain: string) {
  return callVpsApi("list-databases", { domain });
}

export async function createDatabase(domain: string, dbName: string, dbUsername: string, dbPassword: string) {
  return callVpsApi("create-database", { domain, dbName, dbUsername, dbPassword });
}

export async function deleteDatabase(dbName: string) {
  return callVpsApi("delete-database", { dbName });
}

// ─── Email ──────────────────────────────────────────────────────────────────
export async function listEmails(domain: string) {
  return callVpsApi("list-emails", { domain });
}

export async function createEmail(domain: string, email: string, password: string) {
  return callVpsApi("create-email", { domain, email, password });
}

export async function deleteEmail(email: string) {
  return callVpsApi("delete-email", { email });
}

export async function changeEmailPassword(email: string, password: string) {
  return callVpsApi("change-email-password", { email, password });
}

// ─── DNS ────────────────────────────────────────────────────────────────────
export async function createDnsZone(domain: string) {
  return callVpsApi("create-dns-zone", { domain });
}

export async function listDnsRecords(domain: string, recordType: string) {
  return callVpsApi("list-dns-records", { domain, recordType });
}

export async function addDnsRecord(
  domain: string,
  recordType: string,
  recordName: string,
  value: string,
  ttl?: number,
  priority?: number
) {
  return callVpsApi("add-dns-record", { domain, recordType, recordName, value, ttl, priority });
}

export async function deleteDnsRecord(recordId: string) {
  return callVpsApi("delete-dns-record", { recordId });
}

export async function deleteDnsZone(domain: string) {
  return callVpsApi("delete-dns-zone", { domain });
}

// ─── Backups ────────────────────────────────────────────────────────────────
export async function createBackup(domain: string, destination?: string) {
  return callVpsApi("create-backup", { domain, destination });
}

export async function listBackups(domain: string) {
  return callVpsApi("list-backups", { domain });
}

export async function restoreBackup(backupFile: string) {
  return callVpsApi("restore-backup", { backupFile });
}

export async function deleteBackup(backupFile: string) {
  return callVpsApi("delete-backup", { backupFile });
}

// ─── DNS Check (separate edge function) ─────────────────────────────────────
export async function checkDns(domain: string, hostingAccountId?: string) {
  await assertApiEnabled("check-dns", "DNS Checker");
  const { data, error } = await supabase.functions.invoke("check-dns", {
    body: { domain, hosting_account_id: hostingAccountId },
  });
  if (error) throw new Error(error.message || "DNS check failed");
  return data;
}

// ─── File Manager ───────────────────────────────────────────────────────────
export async function listFiles(domain: string, path?: string) {
  return callVpsApi("list-files", { domain, path });
}

export async function uploadFile(domain: string, path: string, fileName: string, fileData: string) {
  return callVpsApi("upload-file" as any, { domain, path, fileName, fileData });
}

export async function createFile(domain: string, path: string) {
  return callVpsApi("create-file", { domain, path });
}

export async function createFolder(domain: string, path: string) {
  return callVpsApi("create-folder", { domain, path });
}

export async function deleteFiles(domain: string, basePath: string, items: string[], skipTrash = true) {
  return callVpsApi("delete-file", { domain, basePath, items, skipTrash });
}

export async function renameFile(domain: string, basePath: string, existingName: string, newFileName: string) {
  return callVpsApi("rename-file", { domain, basePath, existingName, newFileName });
}

export async function readFile(domain: string, path: string) {
  return callVpsApi("read-file", { domain, path });
}

export async function writeFile(domain: string, path: string, content: string) {
  return callVpsApi("write-file", { domain, path, content });
}
