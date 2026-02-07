import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings, Globe, Key, Server, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const [configStatus, setConfigStatus] = useState({
    namesilo: false,
    vps: false,
    checkingNamesilo: false,
    checkingVps: false,
  });
  const [systemStats, setSystemStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    totalUsers: 0,
    totalServices: 0,
  });

  useEffect(() => {
    loadStats();
    checkApiStatus();
  }, []);

  const loadStats = async () => {
    const [{ count: plans }, { count: activePlans }, { count: users }, { count: services }] = await Promise.all([
      supabase.from("hosting_plans").select("*", { count: "exact", head: true }),
      supabase.from("hosting_plans").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("hosting_accounts").select("*", { count: "exact", head: true }),
    ]);
    setSystemStats({
      totalPlans: plans || 0,
      activePlans: activePlans || 0,
      totalUsers: users || 0,
      totalServices: services || 0,
    });
  };

  const checkApiStatus = async () => {
    // Check NameSilo API
    setConfigStatus(prev => ({ ...prev, checkingNamesilo: true }));
    try {
      const { data, error } = await supabase.functions.invoke("namesilo-api", {
        body: { action: "checkAvailability", domain: "test-ping.com" },
      });
      setConfigStatus(prev => ({
        ...prev,
        namesilo: !error && !data?.error,
        checkingNamesilo: false,
      }));
    } catch {
      setConfigStatus(prev => ({ ...prev, namesilo: false, checkingNamesilo: false }));
    }

    // Check VPS API
    setConfigStatus(prev => ({ ...prev, checkingVps: true }));
    try {
      const { data, error } = await supabase.functions.invoke("vps-api", {
        body: { action: "ssl", domain: "test-ping.com" },
      });
      // If we get a response (even error from VPS) the key is configured
      setConfigStatus(prev => ({
        ...prev,
        vps: !error || (data && !data?.error?.includes("not configured")),
        checkingVps: false,
      }));
    } catch {
      setConfigStatus(prev => ({ ...prev, vps: false, checkingVps: false }));
    }
  };

  const apiCards = [
    {
      name: "NameSilo API",
      description: "Domain registration, DNS management, renewals",
      icon: Globe,
      configured: configStatus.namesilo,
      checking: configStatus.checkingNamesilo,
      secretName: "NAMESILO_API_KEY",
    },
    {
      name: "VPS API",
      description: "Hosting provisioning, account management, SSL",
      icon: Server,
      configured: configStatus.vps,
      checking: configStatus.checkingVps,
      secretName: "VPS_API_KEY",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-semibold text-lg">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and API status</p>
      </div>

      {/* System Overview */}
      <div>
        <h2 className="font-display font-semibold text-sm mb-3">System Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Total Plans</p>
            <p className="text-xl font-display font-bold">{systemStats.totalPlans}</p>
            <p className="text-xs text-accent">{systemStats.activePlans} active</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-xl font-display font-bold">{systemStats.totalUsers}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Total Services</p>
            <p className="text-xl font-display font-bold">{systemStats.totalServices}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">APIs Connected</p>
            <p className="text-xl font-display font-bold">
              {[configStatus.namesilo, configStatus.vps].filter(Boolean).length}/2
            </p>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm">API Configuration</h2>
          <Button variant="outline" size="sm" onClick={checkApiStatus}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh Status
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {apiCards.map((api, i) => (
            <motion.div key={api.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <api.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{api.name}</p>
                    <p className="text-xs text-muted-foreground">{api.description}</p>
                  </div>
                </div>
                {api.checking ? (
                  <Badge variant="secondary">Checking...</Badge>
                ) : api.configured ? (
                  <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> Connected</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Not Set</Badge>
                )}
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Secret Name</p>
                <code className="text-xs font-mono">{api.secretName}</code>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {api.configured
                  ? "API key is configured and working."
                  : "Add this secret in Project Settings → Secrets to enable this integration."}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Setup Guide */}
      <div>
        <h2 className="font-display font-semibold text-sm mb-3">Quick Setup Guide</h2>
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-accent">1</span>
            </div>
            <div>
              <p className="text-sm font-medium">Create Hosting Plans</p>
              <p className="text-xs text-muted-foreground">Go to Plans page and add your packages (Starter, Business, Premium, etc.)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-accent">2</span>
            </div>
            <div>
              <p className="text-sm font-medium">Configure API Keys</p>
              <p className="text-xs text-muted-foreground">Add NAMESILO_API_KEY and VPS_API_KEY in your project secrets</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-accent">3</span>
            </div>
            <div>
              <p className="text-sm font-medium">Test Domain Lookup</p>
              <p className="text-xs text-muted-foreground">Try searching a domain from the client panel to verify NameSilo integration</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-accent">4</span>
            </div>
            <div>
              <p className="text-sm font-medium">Accept Orders</p>
              <p className="text-xs text-muted-foreground">Clients can now purchase hosting and domains from the client panel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
