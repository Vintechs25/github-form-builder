import { supabase } from "@/integrations/supabase/client";

type CoolifyAction =
  | "create-project"
  | "list-projects"
  | "create-app"
  | "deploy-app"
  | "redeploy-app"
  | "stop-app"
  | "delete-app"
  | "get-app-status"
  | "get-logs"
  | "list-apps"
  | "get-app"
  | "list-servers"
  | "list-destinations";

async function callCoolifyApi(action: CoolifyAction, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("coolify-api", {
    body: { action, ...params },
  });
  if (error) {
    let msg = "API call failed";
    try {
      if ("context" in error && (error as any).context?.body) {
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
  if (data && data.error) throw new Error(data.error);
  return data;
}

// ─── Projects ───────────────────────────────────────────────────────────────
export async function createProject(name: string, description?: string) {
  return callCoolifyApi("create-project", { name, description });
}

export async function listProjects() {
  return callCoolifyApi("list-projects");
}

// ─── Applications ───────────────────────────────────────────────────────────
export interface CreateAppParams {
  projectId: string;
  name: string;
  repoUrl: string;
  branch: string;
  domain?: string;
  buildPack?: string;
  serverId?: number;
  destinationId?: number;
}

export async function createApp(params: CreateAppParams) {
  return callCoolifyApi("create-app", params as unknown as Record<string, unknown>);
}

export async function deployApp(appId: string) {
  return callCoolifyApi("deploy-app", { appId });
}

export async function redeployApp(appId: string) {
  return callCoolifyApi("redeploy-app", { appId });
}

export async function stopApp(appId: string) {
  return callCoolifyApi("stop-app", { appId });
}

export async function deleteApp(appId: string) {
  return callCoolifyApi("delete-app", { appId });
}

export async function getAppStatus(appId: string) {
  return callCoolifyApi("get-app-status", { appId });
}

export async function getLogs(appId: string, since?: number) {
  return callCoolifyApi("get-logs", { appId, since });
}

export async function listApps() {
  return callCoolifyApi("list-apps");
}

export async function getApp(appId: string) {
  return callCoolifyApi("get-app", { appId });
}

export async function listServers() {
  return callCoolifyApi("list-servers");
}
