import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── CyberPanel API Endpoint Map ────────────────────────────────────────────
// Official API endpoints (use adminUser/adminPass in JSON body)
const OFFICIAL_API: Record<string, string> = {
  "verify": "verifyConn",
  "create-website": "createWebsite",
  "delete-website": "deleteWebsite",
  "website-status": "submitWebsiteStatus",
  "issue-ssl": "issueSSL",
  "list-packages": "listPackage",
  "change-package": "changePackageAPI",
  "get-user-info": "getUserInfo",
};

// Session-based endpoints (need login cookie first)
const SESSION_API: Record<string, string> = {
  // Database operations
  "list-databases": "/dataBases/fetchDatabases",
  "create-database": "/dataBases/submitDBCreation",
  "delete-database": "/dataBases/submitDatabaseDeletion",
  // Email operations
  "list-emails": "/mailServer/getEmailsForDomain",
  "create-email": "/mailServer/submitEmailCreation",
  "delete-email": "/mailServer/submitEmailDeletion",
  "change-email-password": "/mailServer/changePasswordEmail",
  // DNS operations
  "create-dns-zone": "/dns/zoneCreation",
  "add-dns-record": "/dns/addDNSRecord",
  "delete-dns-record": "/dns/deleteDNSRecord",
  "list-dns-records": "/dns/getCurrentRecordsForDomain",
  "delete-dns-zone": "/dns/submitZoneDeletion",
  // Backup operations
  "create-backup": "/backup/submitBackupCreation",
  "list-backups": "/backup/getCurrentBackups",
  "restore-backup": "/backup/submitRestore",
  "delete-backup": "/backup/deleteBackup",
};

const ALL_ACTIONS = [...Object.keys(OFFICIAL_API), ...Object.keys(SESSION_API)];

// ─── Helper: Get CyberPanel base URL ───────────────────────────────────────
function getCyberPanelUrl(): string {
  let url = Deno.env.get("VPS_API_URL") || "https://panel.vintechcyber.com:8090";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, "");
  // Remove /api suffix if present (we'll add specific paths)
  url = url.replace(/\/api\/?$/, "");
  return url;
}

// ─── Helper: Login to CyberPanel to get session cookie ─────────────────────
async function getCyberPanelSession(baseUrl: string, user: string, pass: string): Promise<string | null> {
  try {
    console.log(`[vps-api] Logging into CyberPanel for session...`);
    const loginUrl = `${baseUrl}/api/loginAPI`;
    
    // loginAPI uses POST form data
    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);

    const res = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "manual", // Don't follow redirect, we need the cookies
    });

    // Extract session cookies from Set-Cookie header
    const cookies: string[] = [];
    // Deno fetch returns headers.getSetCookie() for multiple Set-Cookie headers
    const setCookieHeaders = res.headers.getSetCookie?.() || [];
    
    if (setCookieHeaders.length > 0) {
      for (const cookie of setCookieHeaders) {
        const parts = cookie.split(";")[0]; // Get just name=value
        cookies.push(parts);
      }
    } else {
      // Fallback: try single header
      const singleCookie = res.headers.get("set-cookie");
      if (singleCookie) {
        cookies.push(singleCookie.split(";")[0]);
      }
    }

    const cookieString = cookies.join("; ");
    console.log(`[vps-api] Session cookies obtained: ${cookies.length > 0 ? "yes" : "no"}`);
    return cookieString || null;
  } catch (err) {
    console.error(`[vps-api] Login error:`, err);
    return null;
  }
}

// ─── Helper: Call official API endpoint ─────────────────────────────────────
async function callOfficialApi(
  baseUrl: string, endpoint: string, user: string, pass: string, params: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl}/api/${endpoint}`;
  const body = { adminUser: user, adminPass: pass, ...params };

  console.log(`[vps-api] Official API → ${url}`, { ...body, adminPass: "***" });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  
  return { ok: res.ok, status: res.status, data };
}

// ─── Helper: Call session-based endpoint ────────────────────────────────────
async function callSessionApi(
  baseUrl: string, path: string, sessionCookie: string, params: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${baseUrl}${path}`;
  
  console.log(`[vps-api] Session API → ${url}`, params);

  // Get CSRF token from cookies if available
  const csrfMatch = sessionCookie.match(/csrftoken=([^;]+)/);
  const csrfToken = csrfMatch ? csrfMatch[1] : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cookie": sessionCookie,
    "Referer": `${baseUrl}/`,
  };
  if (csrfToken) {
    headers["X-CSRFToken"] = csrfToken;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
    redirect: "manual",
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { ok: res.ok || res.status === 302, status: res.status, data };
}

// ─── Main Handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Get CyberPanel credentials
    const CYBERPANEL_USER = Deno.env.get("CYBERPANEL_USER");
    const CYBERPANEL_PASS = Deno.env.get("CYBERPANEL_PASS");
    if (!CYBERPANEL_USER || !CYBERPANEL_PASS) {
      return new Response(
        JSON.stringify({ error: "Server credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = getCyberPanelUrl();
    const { action, ...params } = await req.json();

    if (!action || !ALL_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Valid: ${ALL_ACTIONS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[vps-api] User ${userId} → action: ${action}`, params);

    let result: { ok: boolean; status: number; data: Record<string, unknown> };

    // ─── Official API Actions ─────────────────────────────────────────
    if (action in OFFICIAL_API) {
      const endpoint = OFFICIAL_API[action];
      const bodyParams: Record<string, unknown> = {};

      // Map params to CyberPanel expected fields
      switch (action) {
        case "create-website":
          bodyParams.domainName = params.domain;
          bodyParams.ownerEmail = params.ownerEmail || `admin@${params.domain}`;
          bodyParams.packageName = params.package || "Default";
          bodyParams.websiteOwner = params.websiteOwner || "admin";
          bodyParams.ownerPassword = params.ownerPassword || crypto.randomUUID().slice(0, 16);
          if (params.phpSelection) bodyParams.phpSelection = params.phpSelection;
          break;
        case "delete-website":
          bodyParams.domainName = params.domain;
          break;
        case "website-status":
          bodyParams.websiteName = params.domain;
          bodyParams.state = params.state; // "Suspend" or "Activate"
          break;
        case "issue-ssl":
          bodyParams.domainName = params.domain;
          break;
        case "change-package":
          bodyParams.websiteName = params.domain;
          bodyParams.packageName = params.package;
          break;
        case "get-user-info":
          bodyParams.username = params.username;
          break;
        default:
          Object.assign(bodyParams, params);
      }

      result = await callOfficialApi(baseUrl, endpoint, CYBERPANEL_USER, CYBERPANEL_PASS, bodyParams);
    }
    // ─── Session-based Actions ────────────────────────────────────────
    else {
      const path = SESSION_API[action];
      
      // Login to get session cookie
      const sessionCookie = await getCyberPanelSession(baseUrl, CYBERPANEL_USER, CYBERPANEL_PASS);
      if (!sessionCookie) {
        return new Response(
          JSON.stringify({ error: "Failed to authenticate with server" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map params to CyberPanel expected fields for session endpoints
      const bodyParams: Record<string, unknown> = {};
      
      switch (action) {
        case "list-databases":
          bodyParams.databaseWebsite = params.domain;
          break;
        case "create-database":
          bodyParams.databaseWebsite = params.domain;
          bodyParams.dbName = params.dbName;
          bodyParams.dbUsername = params.dbUsername;
          bodyParams.dbPassword = params.dbPassword;
          break;
        case "delete-database":
          bodyParams.dbName = params.dbName;
          break;
        case "list-emails":
          bodyParams.domainName = params.domain;
          break;
        case "create-email":
          bodyParams.domainName = params.domain;
          bodyParams.userName = params.email;
          bodyParams.password = params.password;
          break;
        case "delete-email":
          bodyParams.email = params.email;
          break;
        case "change-email-password":
          bodyParams.email = params.email;
          bodyParams.password = params.password;
          break;
        case "create-dns-zone":
          bodyParams.zoneDomain = params.domain;
          break;
        case "add-dns-record":
          bodyParams.selectedZone = params.domain;
          bodyParams.recordType = params.recordType;
          bodyParams.recordName = params.recordName;
          bodyParams.ttl = params.ttl || 3600;
          // Type-specific content fields
          if (params.recordType === "A") bodyParams.recordContentA = params.value;
          else if (params.recordType === "AAAA") bodyParams.recordContentAAAA = params.value;
          else if (params.recordType === "CNAME") bodyParams.recordContentCNAME = params.value;
          else if (params.recordType === "MX") {
            bodyParams.recordContentMX = params.value;
            bodyParams.priority = params.priority || 10;
          }
          else if (params.recordType === "TXT") bodyParams.recordContentTXT = params.value;
          else if (params.recordType === "NS") bodyParams.recordContentNS = params.value;
          else if (params.recordType === "SRV") bodyParams.recordContentSRV = params.value;
          break;
        case "delete-dns-record":
          bodyParams.id = params.recordId;
          break;
        case "list-dns-records":
          bodyParams.selectedZone = params.domain;
          bodyParams.currentSelection = params.recordType || "aRecord";
          break;
        case "delete-dns-zone":
          bodyParams.zoneDomain = params.domain;
          break;
        case "create-backup":
          bodyParams.websiteToBeBacked = params.domain;
          bodyParams.backupDestinations = params.destination || "local";
          break;
        case "list-backups":
          bodyParams.websiteToBeBacked = params.domain;
          break;
        case "restore-backup":
          bodyParams.backupFile = params.backupFile;
          break;
        case "delete-backup":
          bodyParams.backupFile = params.backupFile;
          break;
        default:
          Object.assign(bodyParams, params);
      }

      result = await callSessionApi(baseUrl, path, sessionCookie, bodyParams);
    }

    console.log(`[vps-api] Response for ${action}: status=${result.status}`, result.data);

    if (!result.ok && result.status >= 400) {
      return new Response(
        JSON.stringify({ error: "Server request failed", status: result.status, details: result.data }),
        { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[vps-api] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
