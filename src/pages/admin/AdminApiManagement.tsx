import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Settings2, Power, PowerOff, Activity, RefreshCw, Search,
  Shield, Zap, Globe, CreditCard, Server, Bell, Clock, BarChart3,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle, Loader2, Eye,
  HeartPulse, Wifi, WifiOff, Key,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface ApiConfig {
  id: string;
  api_name: string;
  display_name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  base_url: string | null;
  health_check_url: string | null;
  last_health_check: string | null;
  health_status: string | null;
  rate_limit_per_minute: number | null;
  timeout_seconds: number | null;
  retry_count: number | null;
  config: Record<string, unknown>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiLog {
  id: string;
  api_name: string;
  action: string;
  status: string;
  details: Record<string, unknown>;
  performed_by: string | null;
  created_at: string;
}

// API-to-secrets mapping
const API_SECRETS_MAP: Record<string, { label: string; secretKey: string }[]> = {
  "coolify-api": [{ label: "Coolify API Token", secretKey: "COOLIFY_API_TOKEN" }],
  "paystack": [{ label: "Paystack Secret Key", secretKey: "PAYSTACK_SECRET_KEY" }],
  "namesilo-api": [{ label: "NameSilo API Key", secretKey: "NAMESILO_API_KEY" }],
  "send-notification-email": [{ label: "Resend API Key", secretKey: "RESEND_API_KEY" }],
  "vps-api": [
    { label: "CyberPanel Username", secretKey: "CYBERPANEL_USER" },
    { label: "CyberPanel Password", secretKey: "CYBERPANEL_PASS" },
  ],
};

const categoryIcons: Record<string, React.ElementType> = {
  deployment: Zap,
  infrastructure: Server,
  domains: Globe,
  billing: CreditCard,
  automation: Clock,
  notifications: Bell,
  admin: Shield,
  general: Settings2,
};

const categoryColors: Record<string, string> = {
  deployment: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  infrastructure: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  domains: "bg-green-500/10 text-green-500 border-green-500/20",
  billing: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  automation: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  notifications: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  general: "bg-muted text-muted-foreground border-border",
};

const AdminApiManagement = () => {
  const { user } = useAuth();
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedApi, setSelectedApi] = useState<ApiConfig | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null);
  const [healthResults, setHealthResults] = useState<Record<string, { status: string; message: string; response_time_ms: number }>>({});

  // Editable fields for config dialog
  const [editRate, setEditRate] = useState(60);
  const [editTimeout, setEditTimeout] = useState(30);
  const [editRetry, setEditRetry] = useState(3);
  const [editHealthUrl, setEditHealthUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // API key fields
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchApis = async () => {
    const { data, error } = await supabase
      .from("api_configurations")
      .select("*")
      .order("category", { ascending: true });
    if (!error && data) setApis(data as unknown as ApiConfig[]);
    setLoading(false);
  };

  const fetchLogs = async (apiName?: string) => {
    let q = supabase
      .from("api_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (apiName) q = q.eq("api_name", apiName);
    const { data } = await q;
    if (data) setLogs(data as unknown as ApiLog[]);
  };

  const runHealthCheck = async (apiName?: string) => {
    setCheckingHealth(apiName || "all");
    try {
      const { data, error } = await supabase.functions.invoke("health-check", {
        body: apiName ? { api_name: apiName } : {},
      });
      if (error) throw new Error(error.message);
      if (data?.results) {
        const newResults: Record<string, { status: string; message: string; response_time_ms: number }> = {};
        for (const r of data.results) {
          newResults[r.api_name] = { status: r.status, message: r.message, response_time_ms: r.response_time_ms || 0 };
        }
        setHealthResults((prev) => ({ ...prev, ...newResults }));
        await logActivity(apiName || "all", "health_check", "success", { results: data.results });
        toast.success(apiName ? `Health check complete for ${apiName}` : `Health check complete for ${data.results.length} APIs`);
      }
      fetchApis();
    } catch (err: any) {
      toast.error(err.message || "Health check failed");
    }
    setCheckingHealth(null);
  };

  useEffect(() => {
    fetchApis();
    fetchLogs();
  }, []);


  const logActivity = async (apiName: string, action: string, status: string, details?: Record<string, unknown>) => {
    await supabase.from("api_activity_logs").insert([{
      api_name: apiName,
      action,
      status,
      details: (details || {}) as any,
      performed_by: user?.id,
    }]);
  };

  const toggleApi = async (api: ApiConfig) => {
    setToggling(api.id);
    const newState = !api.is_enabled;
    const { error } = await supabase
      .from("api_configurations")
      .update({ is_enabled: newState, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("id", api.id);

    if (error) {
      toast.error("Failed to update API status");
    } else {
      toast.success(`${api.display_name} ${newState ? "enabled" : "disabled"}`);
      await logActivity(api.api_name, newState ? "enabled" : "disabled", "success");
      fetchApis();
      fetchLogs();
    }
    setToggling(null);
  };

  const openConfig = (api: ApiConfig) => {
    setSelectedApi(api);
    setEditRate(api.rate_limit_per_minute || 60);
    setEditTimeout(api.timeout_seconds || 30);
    setEditRetry(api.retry_count || 3);
    setEditHealthUrl(api.health_check_url || "");
    setApiKeyValues({});
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    if (!selectedApi) return;
    setSaving(true);

    // Build updated config with any pending API key values
    const secrets = API_SECRETS_MAP[selectedApi.api_name];
    let updatedConfig = { ...(selectedApi.config || {}) } as Record<string, unknown>;
    if (secrets) {
      for (const secret of secrets) {
        const val = apiKeyValues[secret.secretKey]?.trim();
        if (val) {
          updatedConfig[secret.secretKey] = val;
        }
      }
    }

    const { error } = await supabase
      .from("api_configurations")
      .update({
        config: updatedConfig as any,
        rate_limit_per_minute: editRate,
        timeout_seconds: editTimeout,
        retry_count: editRetry,
        health_check_url: editHealthUrl || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq("id", selectedApi.id);

    if (error) {
      toast.error("Failed to save configuration");
    } else {
      toast.success("Configuration saved");
      await logActivity(selectedApi.api_name, "config_updated", "success", {
        rate_limit: editRate, timeout: editTimeout, retry: editRetry,
      });
      fetchApis();
      fetchLogs();
      setConfigOpen(false);
    }
    setSaving(false);
  };

  const saveApiKey = async (apiName: string, secretKey: string) => {
    const value = apiKeyValues[secretKey];
    if (!value?.trim()) {
      toast.error("Please enter a value");
      return;
    }
    setSavingKey(secretKey);
    try {
      // Store the API key in the config jsonb column
      const api = apis.find(a => a.api_name === apiName);
      if (!api) throw new Error("API not found");

      const currentConfig = (api.config || {}) as Record<string, unknown>;
      const updatedConfig = { ...currentConfig, [secretKey]: value.trim() };

      const { error } = await supabase
        .from("api_configurations")
        .update({
          config: updatedConfig as any,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", api.id);

      if (error) throw error;

      toast.success(`${secretKey} updated successfully`);
      await logActivity(apiName, "api_key_updated", "success", { secret_key: secretKey });
      setApiKeyValues(prev => ({ ...prev, [secretKey]: "" }));
      fetchApis();
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to update API key");
    }
    setSavingKey(null);
  };

  const isKeyConfigured = (api: ApiConfig, secretKey: string): boolean => {
    const config = api.config as Record<string, unknown>;
    return !!(config && config[secretKey]);
  };

  const openApiLogs = (api: ApiConfig) => {
    setSelectedApi(api);
    fetchLogs(api.api_name);
    setLogsOpen(true);
  };

  const filteredApis = apis.filter((a) => {
    const matchSearch = a.display_name.toLowerCase().includes(search.toLowerCase()) ||
      a.api_name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(apis.map((a) => a.category))];
  const enabledCount = apis.filter((a) => a.is_enabled).length;
  const disabledCount = apis.filter((a) => !a.is_enabled).length;

  const bulkToggle = async (enable: boolean) => {
    const targets = filteredApis.filter((a) => a.is_enabled !== enable);
    if (!targets.length) return;
    for (const api of targets) {
      await supabase
        .from("api_configurations")
        .update({ is_enabled: enable, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("id", api.id);
      await logActivity(api.api_name, enable ? "bulk_enabled" : "bulk_disabled", "success");
    }
    toast.success(`${targets.length} APIs ${enable ? "enabled" : "disabled"}`);
    fetchApis();
    fetchLogs();
  };

  // Helper to get key status for an API
  const getApiKeyStatus = (api: ApiConfig): "configured" | "missing" | "none" => {
    const secrets = API_SECRETS_MAP[api.api_name];
    if (!secrets) return "none";
    const allConfigured = secrets.every(s => isKeyConfigured(api, s.secretKey));
    return allConfigured ? "configured" : "missing";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Management</h1>
          <p className="text-muted-foreground text-sm">Central control for all platform API endpoints</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => runHealthCheck()} disabled={checkingHealth !== null}>
            {checkingHealth === "all" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <HeartPulse className="w-4 h-4 mr-1" />}
            Health Check All
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(true)}>
            <Power className="w-4 h-4 mr-1" /> Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(false)}>
            <PowerOff className="w-4 h-4 mr-1" /> Disable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => { fetchApis(); fetchLogs(); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apis.length}</p>
                <p className="text-xs text-muted-foreground">Total APIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enabledCount}</p>
                <p className="text-xs text-muted-foreground">Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disabledCount}</p>
                <p className="text-xs text-muted-foreground">Disabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apis.filter(a => a.health_status === "healthy").length}/{apis.filter(a => a.health_status).length}</p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="grid">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search APIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="logs">Activity Log</TabsTrigger>
          </TabsList>
        </div>

        {/* Grid View */}
        <TabsContent value="grid">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApis.map((api) => {
              const Icon = categoryIcons[api.category] || Settings2;
              const colorCls = categoryColors[api.category] || categoryColors.general;
              const keyStatus = getApiKeyStatus(api);
              return (
                <Card key={api.id} className={`transition-all ${!api.is_enabled ? "opacity-60" : ""}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorCls}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{api.display_name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{api.api_name}</p>
                        </div>
                      </div>
                      <Switch
                        checked={api.is_enabled}
                        disabled={toggling === api.id}
                        onCheckedChange={() => toggleApi(api)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{api.description}</p>
                    {/* Health Status */}
                    {(api.health_status || healthResults[api.api_name]) && (() => {
                      const hr = healthResults[api.api_name];
                      const hs = hr?.status || api.health_status;
                      const isHealthy = hs === "healthy";
                      const isDown = hs === "down";
                      return (
                        <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${isHealthy ? "bg-green-500/10" : isDown ? "bg-destructive/10" : "bg-amber-500/10"}`}>
                          {isHealthy ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : isDown ? <WifiOff className="w-3.5 h-3.5 text-destructive" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={`font-medium capitalize ${isHealthy ? "text-green-600" : isDown ? "text-destructive" : "text-amber-600"}`}>{hs}</span>
                          {hr?.response_time_ms ? <span className="text-muted-foreground ml-auto">{hr.response_time_ms}ms</span> : null}
                          {api.last_health_check && !hr && <span className="text-muted-foreground ml-auto">{format(new Date(api.last_health_check), "HH:mm")}</span>}
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] capitalize ${colorCls}`}>{api.category}</Badge>
                      {api.is_enabled ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">Disabled</Badge>
                      )}
                      {api.rate_limit_per_minute && (
                        <Badge variant="outline" className="text-[10px]">{api.rate_limit_per_minute} req/min</Badge>
                      )}
                      {/* API Key indicator */}
                      {keyStatus !== "none" && (
                        <Badge variant="outline" className={`text-[10px] gap-1 ${keyStatus === "configured" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                          <Key className="w-3 h-3" />
                          {keyStatus === "configured" ? "Key Set" : "Key Missing"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => runHealthCheck(api.api_name)} disabled={checkingHealth !== null}>
                        {checkingHealth === api.api_name ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <HeartPulse className="w-3.5 h-3.5 mr-1" />} Ping
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openConfig(api)}>
                        <Settings2 className="w-3.5 h-3.5 mr-1" /> Configure
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openApiLogs(api)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {!filteredApis.length && (
            <div className="text-center py-12 text-muted-foreground">No APIs match your search.</div>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>API</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Timeout</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApis.map((api) => {
                  const colorCls = categoryColors[api.category] || categoryColors.general;
                  const keyStatus = getApiKeyStatus(api);
                  return (
                    <TableRow key={api.id} className={!api.is_enabled ? "opacity-60" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{api.display_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{api.api_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-[10px] ${colorCls}`}>{api.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {keyStatus === "none" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : keyStatus === "configured" ? (
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs text-green-600 font-medium">Set</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs text-red-500 font-medium">Missing</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const hr = healthResults[api.api_name];
                          const hs = hr?.status || api.health_status;
                          if (!hs) return <span className="text-xs text-muted-foreground">—</span>;
                          const isHealthy = hs === "healthy";
                          const isDown = hs === "down";
                          return (
                            <div className="flex items-center gap-1.5">
                              {isHealthy ? <Wifi className="w-3.5 h-3.5 text-green-500" /> : isDown ? <WifiOff className="w-3.5 h-3.5 text-destructive" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                              <span className={`text-xs font-medium capitalize ${isHealthy ? "text-green-600" : isDown ? "text-destructive" : "text-amber-600"}`}>{hs}</span>
                              {hr?.response_time_ms ? <span className="text-[10px] text-muted-foreground">({hr.response_time_ms}ms)</span> : null}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Switch checked={api.is_enabled} disabled={toggling === api.id} onCheckedChange={() => toggleApi(api)} />
                      </TableCell>
                      <TableCell className="text-sm">{api.rate_limit_per_minute}/min</TableCell>
                      <TableCell className="text-sm">{api.timeout_seconds}s</TableCell>
                      <TableCell className="text-sm">{api.retry_count}x</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openConfig(api)}>
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openApiLogs(api)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Activity Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`w-2 h-2 rounded-full ${log.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <span className="font-mono text-xs text-muted-foreground">{log.api_name}</span>
                          <ChevronRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                          <span className="capitalize">{log.action.replace(/_/g, " ")}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configure Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {selectedApi?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* API Key Section */}
            {selectedApi && API_SECRETS_MAP[selectedApi.api_name] ? (
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Keys / Secrets</Label>
                {API_SECRETS_MAP[selectedApi.api_name].map((secret) => {
                  const configured = isKeyConfigured(selectedApi, secret.secretKey);
                  return (
                    <div key={secret.secretKey} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{secret.label}</Label>
                        <div className="flex items-center gap-1.5">
                          {configured ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-[10px] text-green-600 font-medium">Configured</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-[10px] text-red-500 font-medium">Not set</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={configured ? "••••••••••••" : `Enter ${secret.label}`}
                          value={apiKeyValues[secret.secretKey] || ""}
                          onChange={(e) => setApiKeyValues(prev => ({ ...prev, [secret.secretKey]: e.target.value }))}
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingKey === secret.secretKey || !apiKeyValues[secret.secretKey]?.trim()}
                          onClick={() => saveApiKey(selectedApi.api_name, secret.secretKey)}
                        >
                          {savingKey === secret.secretKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedApi ? (
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">No external API key required — uses internal authentication.</span>
              </div>
            ) : null}

            <div className="border-t pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Settings</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Rate Limit (req/min)</Label>
                  <Input type="number" value={editRate} onChange={(e) => setEditRate(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Timeout (seconds)</Label>
                  <Input type="number" value={editTimeout} onChange={(e) => setEditTimeout(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Retry Count</Label>
                  <Input type="number" value={editRetry} onChange={(e) => setEditRetry(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Health Check URL</Label>
              <Input placeholder="https://api.example.com/health" value={editHealthUrl} onChange={(e) => setEditHealthUrl(e.target.value)} />
            </div>
            {selectedApi && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">Internal name:</span> <span className="font-mono">{selectedApi.api_name}</span></p>
                <p><span className="text-muted-foreground">Category:</span> <span className="capitalize">{selectedApi.category}</span></p>
                <p><span className="text-muted-foreground">Last updated:</span> {format(new Date(selectedApi.updated_at), "PPp")}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedApi?.display_name} — Activity Log</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activity for this API.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm capitalize">{log.action.replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminApiManagement;
