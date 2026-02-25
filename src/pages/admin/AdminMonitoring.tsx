import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server, Cpu, HardDrive, MemoryStick, Activity, Globe, Rocket,
  Users, Mail, RefreshCw, Loader2, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [coolifyStatus, setCoolifyStatus] = useState<any>(null);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalUsers: 0, totalWebsites: 0, totalApps: 0, totalDomains: 0,
    activeServices: 0, totalStorageMb: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    const [
      { count: users }, { count: websites }, { count: apps }, { count: domains },
      { data: services }, { data: logins }, { data: profs },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("hosting_accounts").select("*", { count: "exact", head: true }).eq("hosting_type", "shared_hosting"),
      supabase.from("hosting_accounts").select("*", { count: "exact", head: true }).eq("hosting_type", "application"),
      supabase.from("domains").select("*", { count: "exact", head: true }),
      supabase.from("hosting_accounts").select("status, storage_used_mb"),
      supabase.from("login_history").select("*").order("login_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("user_id, first_name, last_name, email"),
    ]);

    const active = services?.filter(s => s.status === "active").length || 0;
    const totalStorage = services?.reduce((s, sv) => s + (sv.storage_used_mb || 0), 0) || 0;

    setStats({
      totalUsers: users || 0, totalWebsites: websites || 0, totalApps: apps || 0,
      totalDomains: domains || 0, activeServices: active, totalStorageMb: totalStorage,
    });
    setLoginHistory(logins || []);
    const map: Record<string, string> = {};
    profs?.forEach(p => { map[p.user_id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown"; });
    setProfiles(map);
    setLoading(false);
  };

  const checkServers = async () => {
    setRefreshing(true);
    try {
      const [vps, coolify] = await Promise.allSettled([
        supabase.functions.invoke("vps-api", { body: { action: "verify" } }),
        supabase.functions.invoke("coolify-api", { body: { action: "list-servers" } }),
      ]);
      setServerStatus(vps.status === "fulfilled" ? vps.value : { error: true });
      setCoolifyStatus(coolify.status === "fulfilled" ? coolify.value : { error: true });
    } catch {
      toast.error("Failed to check servers");
    }
    setRefreshing(false);
  };

  useEffect(() => { loadAll(); checkServers(); }, []);

  const infCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Websites", value: stats.totalWebsites, icon: Globe, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Applications", value: stats.totalApps, icon: Rocket, color: "text-accent", bg: "bg-accent/10" },
    { label: "Active Services", value: stats.activeServices, icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Total Domains", value: stats.totalDomains, icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Total Storage", value: `${(stats.totalStorageMb / 1024).toFixed(1)} GB`, icon: HardDrive, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">System Monitoring</h1>
          <p className="text-sm text-muted-foreground">Infrastructure overview & login history</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadAll(); checkServers(); }} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {infCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card rounded-xl border border-border p-4">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-lg font-display font-bold">{card.value}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Server status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-sm">VPS / CyberPanel</h2>
            </div>
            {serverStatus && !serverStatus.error ? (
              <Badge variant="default" className="gap-1 text-[10px]"><CheckCircle className="w-2.5 h-2.5" /> Connected</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle className="w-2.5 h-2.5" /> Offline</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Shared hosting engine for websites, email, SSL, DNS</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-sm">Coolify App Engine</h2>
            </div>
            {coolifyStatus && !coolifyStatus.error ? (
              <Badge variant="default" className="gap-1 text-[10px]"><CheckCircle className="w-2.5 h-2.5" /> Connected</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle className="w-2.5 h-2.5" /> Offline</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Application hosting engine for Git-based deployments</p>
        </div>
      </div>

      {/* Login History */}
      <Tabs defaultValue="logins" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="logins">Login History</TabsTrigger>
        </TabsList>
        <TabsContent value="logins">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No login history recorded yet</TableCell></TableRow>
                ) : loginHistory.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{profiles[l.user_id] || l.user_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(l.login_at), "MMM d, HH:mm:ss")}</TableCell>
                    <TableCell className="text-xs font-mono">{l.ip_address || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={l.success ? "default" : "destructive"} className="text-[10px]">
                        {l.success ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMonitoring;
