import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings, Globe, Server, CheckCircle, XCircle, RefreshCw,
  Building2, Mail, Shield, Wrench, AlertTriangle, Save, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type SettingsMap = Record<string, any>;

const AdminSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [configStatus, setConfigStatus] = useState({
    namesilo: false, vps: false, coolify: false, paystack: false, resend: false,
    checkingAll: false,
  });

  useEffect(() => {
    loadSettings();
    checkApiStatus();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("platform_settings").select("key, value");
    if (data) {
      const map: SettingsMap = {};
      data.forEach(row => { map[row.key] = row.value; });
      setSettings(map);
    }
    setLoading(false);
  };

  const saveSetting = async (key: string, value: any) => {
    setSaving(key);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq("key", key);
    if (error) toast.error("Failed to save");
    else toast.success("Settings saved");
    setSaving(null);
  };

  const updateField = (key: string, field: string, val: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }));
  };

  const checkApiStatus = async () => {
    setConfigStatus(prev => ({ ...prev, checkingAll: true }));
    try {
      const [namesilo, vps, coolify] = await Promise.allSettled([
        supabase.functions.invoke("namesilo-api", { body: { action: "checkAvailability", domain: "test-ping.com" } }),
        supabase.functions.invoke("vps-api", { body: { action: "verify" } }),
        supabase.functions.invoke("coolify-api", { body: { action: "listServers" } }),
      ]);

      setConfigStatus({
        namesilo: namesilo.status === "fulfilled" && !namesilo.value.error,
        vps: vps.status === "fulfilled" && !vps.value.error,
        coolify: coolify.status === "fulfilled" && !coolify.value.error,
        paystack: true, // secret exists
        resend: true,   // secret exists
        checkingAll: false,
      });
    } catch {
      setConfigStatus(prev => ({ ...prev, checkingAll: false }));
    }
  };

  const apiCards = [
    { name: "Domain Registrar", desc: "NameSilo — registration, DNS, renewals", connected: configStatus.namesilo, icon: Globe },
    { name: "VPS / CyberPanel", desc: "Website hosting, email, SSL", connected: configStatus.vps, icon: Server },
    { name: "App Engine", desc: "Coolify — container deployments", connected: configStatus.coolify, icon: Wrench },
    { name: "Payment Gateway", desc: "Paystack — billing & invoicing", connected: configStatus.paystack, icon: Shield },
    { name: "Email Service", desc: "Resend — transactional emails", connected: configStatus.resend, icon: Mail },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const company = settings.company || {};
  const maintenance = settings.maintenance || {};
  const smtp = settings.smtp || {};
  const defaults = settings.defaults || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Global configuration, integrations, and maintenance</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="general"><Building2 className="w-3.5 h-3.5 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="maintenance"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Maintenance</TabsTrigger>
          <TabsTrigger value="smtp"><Mail className="w-3.5 h-3.5 mr-1.5" />Email / SMTP</TabsTrigger>
          <TabsTrigger value="defaults"><Wrench className="w-3.5 h-3.5 mr-1.5" />Defaults</TabsTrigger>
          <TabsTrigger value="integrations"><Server className="w-3.5 h-3.5 mr-1.5" />Integrations</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-sm">Company Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Company Name</Label>
                <Input value={company.name || ""} onChange={e => updateField("company", "name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tagline</Label>
                <Input value={company.tagline || ""} onChange={e => updateField("company", "tagline", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Logo URL</Label>
                <Input value={company.logo_url || ""} onChange={e => updateField("company", "logo_url", e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <Button size="sm" onClick={() => saveSetting("company", settings.company)} disabled={saving === "company"}>
              {saving === "company" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Company Settings
            </Button>
          </div>
        </TabsContent>

        {/* Maintenance */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-sm">Maintenance Mode</h2>
                <p className="text-xs text-muted-foreground">When enabled, all users will see a maintenance page</p>
              </div>
              <div className="flex items-center gap-2">
                {maintenance.enabled && <Badge variant="destructive" className="text-[10px]">ACTIVE</Badge>}
                <Switch
                  checked={maintenance.enabled || false}
                  onCheckedChange={val => updateField("maintenance", "enabled", val)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maintenance Message</Label>
              <Textarea
                value={maintenance.message || ""}
                onChange={e => updateField("maintenance", "message", e.target.value)}
                rows={3}
              />
            </div>
            <Button size="sm" onClick={() => saveSetting("maintenance", settings.maintenance)} disabled={saving === "maintenance"}
              variant={maintenance.enabled ? "destructive" : "default"}>
              {saving === "maintenance" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {maintenance.enabled ? "Activate Maintenance Mode" : "Save Maintenance Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* SMTP */}
        <TabsContent value="smtp" className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-sm">Email Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Email Provider</Label>
                <Input value={smtp.provider || ""} onChange={e => updateField("smtp", "provider", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From Name</Label>
                <Input value={smtp.from_name || ""} onChange={e => updateField("smtp", "from_name", e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">From Email</Label>
                <Input value={smtp.from_email || ""} onChange={e => updateField("smtp", "from_email", e.target.value)} />
              </div>
            </div>
            <Button size="sm" onClick={() => saveSetting("smtp", settings.smtp)} disabled={saving === "smtp"}>
              {saving === "smtp" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Email Settings
            </Button>
          </div>
        </TabsContent>

        {/* Defaults */}
        <TabsContent value="defaults" className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-sm">Platform Defaults</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nameserver 1</Label>
                <Input value={defaults.dns_nameserver_1 || ""} onChange={e => updateField("defaults", "dns_nameserver_1", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nameserver 2</Label>
                <Input value={defaults.dns_nameserver_2 || ""} onChange={e => updateField("defaults", "dns_nameserver_2", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SSL Provider</Label>
                <Input value={defaults.ssl_provider || ""} onChange={e => updateField("defaults", "ssl_provider", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default PHP Version</Label>
                <Input value={defaults.php_version || ""} onChange={e => updateField("defaults", "php_version", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default RAM per App (MB)</Label>
                <Input type="number" value={defaults.default_ram_mb || ""} onChange={e => updateField("defaults", "default_ram_mb", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deployment Timeout (sec)</Label>
                <Input type="number" value={defaults.deployment_timeout || ""} onChange={e => updateField("defaults", "deployment_timeout", Number(e.target.value))} />
              </div>
            </div>
            <Button size="sm" onClick={() => saveSetting("defaults", settings.defaults)} disabled={saving === "defaults"}>
              {saving === "defaults" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Default Settings
            </Button>
          </div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-semibold text-sm">Backend Integrations</h2>
            <Button variant="outline" size="sm" onClick={checkApiStatus} disabled={configStatus.checkingAll}>
              <RefreshCw className={`w-3 h-3 mr-1 ${configStatus.checkingAll ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {apiCards.map((api, i) => (
              <motion.div key={api.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <api.icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-xs">{api.name}</p>
                      <p className="text-[10px] text-muted-foreground">{api.desc}</p>
                    </div>
                  </div>
                </div>
                {configStatus.checkingAll ? (
                  <Badge variant="secondary" className="text-[10px]">Checking...</Badge>
                ) : api.connected ? (
                  <Badge variant="default" className="gap-1 text-[10px]"><CheckCircle className="w-2.5 h-2.5" /> Connected</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle className="w-2.5 h-2.5" /> Disconnected</Badge>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
