import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COOLIFY_BASE = "http://129.213.33.201:8000/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }

  const COOLIFY_TOKEN = Deno.env.get("COOLIFY_API_TOKEN");
  if (!COOLIFY_TOKEN) {
    return json({ error: "COOLIFY_API_TOKEN not configured" }, 500);
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "create-project":
        return await createProject(COOLIFY_TOKEN, params);
      case "list-projects":
        return await listProjects(COOLIFY_TOKEN);
      case "create-app":
        return await createApp(COOLIFY_TOKEN, params);
      case "deploy-app":
        return await deployApp(COOLIFY_TOKEN, params);
      case "redeploy-app":
        return await redeployApp(COOLIFY_TOKEN, params);
      case "stop-app":
        return await stopApp(COOLIFY_TOKEN, params);
      case "delete-app":
        return await deleteApp(COOLIFY_TOKEN, params);
      case "get-app-status":
        return await getAppStatus(COOLIFY_TOKEN, params);
      case "get-logs":
        return await getLogs(COOLIFY_TOKEN, params);
      case "list-apps":
        return await listApps(COOLIFY_TOKEN, params);
      case "get-app":
        return await getApp(COOLIFY_TOKEN, params);
      case "list-servers":
        return await listServers(COOLIFY_TOKEN);
      case "list-envs":
        return await listEnvs(COOLIFY_TOKEN, params);
      case "create-env":
        return await createEnv(COOLIFY_TOKEN, params);
      case "delete-env":
        return await deleteEnv(COOLIFY_TOKEN, params);
      case "list-deployments":
        return await listDeployments(COOLIFY_TOKEN, params);
      case "get-build-logs":
        return await getBuildLogs(COOLIFY_TOKEN, params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("coolify-api error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function coolifyFetch(
  token: string,
  path: string,
  method = "GET",
  body?: unknown
) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${COOLIFY_BASE}${path}`, opts);
  const text = await res.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    console.error("Coolify API error response:", text.slice(0, 1000));
    const msg = typeof parsed === "object" && parsed !== null && "message" in parsed
      ? (parsed as any).message
      : `Coolify API error ${res.status}: ${text.slice(0, 500)}`;
    throw new Error(msg);
  }

  return parsed;
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function createProject(token: string, params: any) {
  const data = await coolifyFetch(token, "/projects", "POST", {
    name: params.name,
    description: params.description || "",
  });
  return json(data);
}

async function listProjects(token: string) {
  const data = await coolifyFetch(token, "/projects");
  return json(data);
}

async function createApp(token: string, params: any) {
  // Auto-fetch server_uuid if not provided
  let serverUuid = params.serverUuid;
  if (!serverUuid) {
    const servers = await coolifyFetch(token, "/servers") as any[];
    if (!servers || servers.length === 0) {
      throw new Error("No servers available in Coolify");
    }
    serverUuid = servers[0].uuid;
  }

  const payload: any = {
    project_uuid: params.projectId,
    server_uuid: serverUuid,
    environment_name: params.environment || "production",
    git_repository: params.repoUrl,
    git_branch: params.branch || "main",
    build_pack: params.buildPack || "nixpacks",
    ports_exposes: params.portsExposes || "3000",
  };

  if (params.domain) {
    payload.domains = params.domain;
  }

  console.log("Creating app with payload:", JSON.stringify(payload));
  const data = await coolifyFetch(token, "/applications/public", "POST", payload);
  return json(data);
}

async function listServers(token: string) {
  const data = await coolifyFetch(token, "/servers");
  return json(data);
}

async function deployApp(token: string, params: any) {
  const data = await coolifyFetch(
    token,
    `/applications/${params.appId}/restart`,
    "POST"
  );
  return json(data);
}

async function redeployApp(token: string, params: any) {
  const data = await coolifyFetch(
    token,
    `/applications/${params.appId}/restart`,
    "POST"
  );
  return json(data);
}

async function stopApp(token: string, params: any) {
  const data = await coolifyFetch(
    token,
    `/applications/${params.appId}/stop`,
    "POST"
  );
  return json(data);
}

async function deleteApp(token: string, params: any) {
  const data = await coolifyFetch(
    token,
    `/applications/${params.appId}`,
    "DELETE",
    {
      delete_configurations: true,
      delete_volumes: true,
    }
  );
  return json(data);
}

async function getAppStatus(token: string, params: any) {
  const data = await coolifyFetch(
    token,
    `/applications/${params.appId}`
  );
  return json(data);
}

async function getLogs(token: string, params: any) {
  try {
    const data = await coolifyFetch(
      token,
      `/applications/${params.appId}/logs?since=${params.since || 600}`
    );
    return json(data);
  } catch (e: any) {
    if (e.message?.includes("not running")) {
      return json({ logs: [], message: "Application is not running yet." });
    }
    throw e;
  }
}

async function listApps(token: string, params: any) {
  // List all applications, optionally filter by project
  const data = await coolifyFetch(token, "/applications");
  return json(data);
}

async function getApp(token: string, params: any) {
  const data = await coolifyFetch(token, `/applications/${params.appId}`);
  return json(data);
}

// ─── Environment Variables ──────────────────────────────────────────────────

async function listEnvs(token: string, params: any) {
  const data = await coolifyFetch(token, `/applications/${params.appId}/envs`);
  return json(data);
}

async function createEnv(token: string, params: any) {
  const data = await coolifyFetch(token, `/applications/${params.appId}/envs`, "POST", {
    key: params.key,
    value: params.value,
    is_preview: false,
  });
  return json(data);
}

async function deleteEnv(token: string, params: any) {
  const data = await coolifyFetch(
    token,
    `/applications/${params.appId}/envs/${params.envUuid}`,
    "DELETE"
  );
  return json(data);
}

// ─── Deployments ────────────────────────────────────────────────────────────

async function listDeployments(token: string, params: any) {
  const data = await coolifyFetch(token, `/applications/${params.appId}/deployments`);
  return json(data);
}

async function getBuildLogs(token: string, params: any) {
  try {
    const data = await coolifyFetch(
      token,
      `/deployments/${params.deploymentUuid}`
    );
    return json(data);
  } catch (e: any) {
    if (e.message?.includes("not found") || e.message?.includes("not running")) {
      return json({ logs: "", status: "unknown", message: "Build logs not available yet." });
    }
    throw e;
  }
}
