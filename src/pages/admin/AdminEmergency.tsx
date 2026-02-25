import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle, Power, StopCircle, Shield, Loader2, RefreshCw,
  Globe, Rocket, Zap, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";
import { useAuth } from "@/hooks/useAuth";

const AdminEmergency = () => {
  const { user } = useAuth();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [sharedHostingEnabled, setSharedHostingEnabled] = useState(true);
  const [appHostingEnabled, setAppHostingEnabled] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load current settings
  useState(() => {
    const load = async () => {
      const { data } = await supabase.from("platform_settings").select("key, value");
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(r => { map[r.key] = r.value; });
        if (map.maintenance) {
          setMaintenanceEnabled(map.maintenance.enabled || false);
          setMaintenanceMsg(map.maintenance.message || "");
        }
        if (map.runtimes) {
          setSharedHostingEnabled(map.runtimes.shared_hosting !== false);
          setAppHostingEnabled(map.runtimes.app_hosting !== false);
        }
      }
      setInitialLoaded(true);
    };
    load();
  });

  const saveMaintenanceMode = async () => {
    setLoading("maintenance");
    const value = { enabled: maintenanceEnabled, message: maintenanceMsg };
    
    // Try update first, then upsert
    const { data: existing } = await supabase.from("platform_settings").select("id").eq("key", "maintenance").maybeSingle();
    if (existing) {
      await supabase.from("platform_settings").update({ value: value as any, updated_by: user?.id }).eq("key", "maintenance");
    } else {
      await supabase.from("platform_settings").insert([{ key: "maintenance", value: value as any, updated_by: user?.id }]);
    }
    
    logAudit(maintenanceEnabled ? "enable_maintenance" : "disable_maintenance", "platform", undefined, { message: maintenanceMsg });
    toast.success(maintenanceEnabled ? "⚠️ Maintenance mode ACTIVATED" : "Maintenance mode disabled");
    setLoading(null);
  };

  const saveRuntimeSettings = async () => {
    setLoading("runtimes");
    const value = { shared_hosting: sharedHostingEnabled, app_hosting: appHostingEnabled };
    
    const { data: existing } = await supabase.from("platform_settings").select("id").eq("key", "runtimes").maybeSingle();
    if (existing) {
      await supabase.from("platform_settings").update({ value: value as any, updated_by: user?.id }).eq("key", "runtimes");
    } else {
      await supabase.from("platform_settings").insert([{ key: "runtimes", value: value as any, updated_by: user?.id }]);
    }
    
    logAudit("update_runtimes", "platform", undefined, value);
    toast.success("Runtime settings saved");
    setLoading(null);
  };

  const suspendAllServices = async () => {
    if (!confirm("⚠️ DANGER: This will suspend ALL active hosting accounts. Are you absolutely sure?")) return;
    setLoading("suspend-all");
    const { error, count } = await supabase.from("hosting_accounts").update({ status: "suspended" }).eq("status", "active");
    if (error) toast.error(error.message);
    else {
      logAudit("suspend_all_services", "platform", undefined, { count });
      toast.success(`All active services suspended`);
    }
    setLoading(null);
  };

  const stopAllContainers = async () => {
    if (!confirm("⚠️ DANGER: This will attempt to stop ALL running application containers via the app engine. Continue?")) return;
    setLoading("stop-containers");
    
    // Get all active app hosting accounts with backend_id
    const { data: apps } = await supabase.from("hosting_accounts")
      .select("id, backend_id, domain")
      .eq("hosting_type", "application")
      .eq("status", "active")
      .not("backend_id", "is", null);

    let stopped = 0;
    if (apps) {
      for (const app of apps) {
        try {
          await supabase.functions.invoke("coolify-api", { body: { action: "stop-app", appId: app.backend_id } });
          stopped++;
        } catch { /* continue */ }
      }
    }
    
    logAudit("stop_all_containers", "platform", undefined, { attempted: apps?.length || 0, stopped });
    toast.success(`Stopped ${stopped} containers`);
    setLoading(null);
  };

  const blockUser = async () => {
    const email = prompt("Enter the email of the user to block immediately:");
    if (!email) return;
    setLoading("block-user");
    
    const { data: profile } = await supabase.from("profiles").select("id, user_id").eq("email", email).maybeSingle();
    if (!profile) { toast.error("User not found"); setLoading(null); return; }
    
    // Suspend account
    await supabase.from("profiles").update({ account_status: "suspended" }).eq("id", profile.id);
    // Suspend all their services
    await supabase.from("hosting_accounts").update({ status: "suspended" }).eq("user_id", profile.user_id);
    
    logAudit("block_user", "user", profile.user_id, { email });
    toast.success(`User ${email} blocked and all services suspended`);
    setLoading(null);
  };

  if (!initialLoaded) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-destructive" /> Emergency Controls
        </h1>
        <p className="text-sm text-muted-foreground">Critical platform operations — use with extreme caution</p>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-sm">🔒 Global Maintenance Mode</h2>
            <p className="text-xs text-muted-foreground">Block all non-admin users from the platform</p>
          </div>
          <div className="flex items-center gap-2">
            {maintenanceEnabled && <Badge variant="destructive" className="text-[10px]">ACTIVE</Badge>}
            <Switch checked={maintenanceEnabled} onCheckedChange={setMaintenanceEnabled} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Maintenance Message</Label>
          <Textarea value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)} rows={2}
            placeholder="We're performing scheduled maintenance..." />
        </div>
        <Button size="sm" onClick={saveMaintenanceMode} disabled={loading === "maintenance"}
          variant={maintenanceEnabled ? "destructive" : "default"}>
          {loading === "maintenance" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Shield className="w-3.5 h-3.5 mr-1.5" />}
          {maintenanceEnabled ? "Activate Maintenance" : "Save Settings"}
        </Button>
      </div>

      {/* Runtime Controls */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm">⚙️ Runtime Engine Controls</h2>
        <p className="text-xs text-muted-foreground">Enable or disable hosting engines globally</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between bg-secondary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Shared Hosting</p>
                <p className="text-[10px] text-muted-foreground">Websites, email, DNS</p>
              </div>
            </div>
            <Switch checked={sharedHostingEnabled} onCheckedChange={setSharedHostingEnabled} />
          </div>
          <div className="flex items-center justify-between bg-secondary rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium">App Hosting</p>
                <p className="text-[10px] text-muted-foreground">Container deployments</p>
              </div>
            </div>
            <Switch checked={appHostingEnabled} onCheckedChange={setAppHostingEnabled} />
          </div>
        </div>
        <Button size="sm" onClick={saveRuntimeSettings} disabled={loading === "runtimes"}>
          {loading === "runtimes" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Save Runtime Settings
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h2>
        <p className="text-xs text-muted-foreground">These actions are immediate and may be irreversible</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button variant="destructive" size="sm" onClick={suspendAllServices} disabled={loading === "suspend-all"} className="justify-start">
            {loading === "suspend-all" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Power className="w-3.5 h-3.5 mr-1.5" />}
            Suspend All Services
          </Button>
          <Button variant="destructive" size="sm" onClick={stopAllContainers} disabled={loading === "stop-containers"} className="justify-start">
            {loading === "stop-containers" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5 mr-1.5" />}
            Stop All Containers
          </Button>
          <Button variant="destructive" size="sm" onClick={blockUser} disabled={loading === "block-user"} className="justify-start">
            {loading === "block-user" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Ban className="w-3.5 h-3.5 mr-1.5" />}
            Block Abusive User
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminEmergency;
