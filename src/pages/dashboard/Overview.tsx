import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Globe, Database, Mail, ChevronRight, Plus, Clock, CheckCircle2,
  AlertTriangle, Rocket, BarChart3, HardDrive, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as coolify from "@/services/coolifyService";
import type { User } from "@supabase/supabase-js";

interface ContextType {
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
  user: User | null;
}

const Overview = () => {
  const { profile, user } = useOutletContext<ContextType>();
  const [hostingAccounts, setHostingAccounts] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [stats, setStats] = useState({
    websites: 0,
    applications: 0,
    pendingDns: 0,
    storageMb: 0,
    tickets: 0,
  });
  const [planInfo, setPlanInfo] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: accounts }, { data: tickets }, { data: plans }] = await Promise.all([
        supabase.from("hosting_accounts").select("*, hosting_plans(*)").eq("user_id", user.id),
        supabase.from("support_tickets").select("id").eq("user_id", user.id).in("status", ["open", "in_progress"]),
        supabase.from("hosting_accounts").select("hosting_plans(*)").eq("user_id", user.id).eq("status", "active").limit(1),
      ]);

      const accs = accounts || [];
      setHostingAccounts(accs);

      if (plans && plans.length > 0) {
        setPlanInfo((plans[0] as any)?.hosting_plans);
      }

      // Load apps from application runtime
      try {
        const appsRes = await coolify.listApps();
        setApps(Array.isArray(appsRes) ? appsRes : []);
      } catch {
        setApps([]);
      }

      setStats({
        websites: accs.filter((a) => a.status === "active").length,
        applications: 0, // updated after apps load
        pendingDns: accs.filter((a) => a.status === "pending_dns").length,
        storageMb: accs.reduce((s, a) => s + (a.storage_used_mb || 0), 0),
        tickets: tickets?.length || 0,
      });
    };
    load();
  }, [user]);

  // Update app count after apps load
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      applications: apps.filter((a) => (a.status || "").toLowerCase().includes("running")).length,
    }));
  }, [apps]);

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  const totalServices = stats.websites + apps.length;
  const runningServices = stats.websites + stats.applications;

  // Combine all services for the unified list
  const allServices = [
    ...hostingAccounts
      .filter((a) => a.status === "active" || a.status === "pending_dns" || a.status === "suspended")
      .map((a) => ({
        id: a.id,
        name: a.domain,
        type: "Website" as const,
        status: a.status === "active" ? "running" : a.status === "pending_dns" ? "pending" : "stopped",
        domain: a.domain,
      })),
    ...apps.map((a) => ({
      id: a.uuid,
      name: a.name || a.uuid,
      type: "Application" as const,
      status: (a.status || "").toLowerCase().includes("running")
        ? "running"
        : (a.status || "").toLowerCase().includes("building")
        ? "building"
        : "stopped",
      domain: a.fqdn ? String(a.fqdn).replace(/^https?:\/\//, "") : "—",
    })),
  ];

  const statusIcon = (status: string) => {
    if (status === "running") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === "building") return <Clock className="w-4 h-4 text-warning animate-spin" />;
    if (status === "pending") return <Clock className="w-4 h-4 text-warning" />;
    return <AlertTriangle className="w-4 h-4 text-destructive" />;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      running: { label: "Running", cls: "bg-success/10 text-success" },
      building: { label: "Building", cls: "bg-warning/10 text-warning" },
      pending: { label: "Pending", cls: "bg-warning/10 text-warning" },
      stopped: { label: "Stopped", cls: "bg-destructive/10 text-destructive" },
    };
    const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your cloud hosting overview</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/websites">
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Website
            </Button>
          </Link>
          <Link to="/dashboard/applications">
            <Button variant="accent" size="sm">
              <Rocket className="w-4 h-4 mr-1" /> Deploy App
            </Button>
          </Link>
        </div>
      </div>

      {/* Suspension alert */}
      {hostingAccounts.filter((a) => a.status === "suspended").length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                {hostingAccounts.filter((a) => a.status === "suspended").length} service{hostingAccounts.filter((a) => a.status === "suspended").length > 1 ? "s" : ""} suspended
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Suspended due to an overdue invoice. Pay now to restore service.
              </p>
              <Link to="/dashboard/billing">
                <Button variant="destructive" size="sm" className="mt-3">Pay Now <ChevronRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-accent/10 to-gold/10 rounded-2xl p-6 border border-accent/20">
        <h2 className="font-display font-bold text-xl mb-2">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}! 👋
        </h2>
        <p className="text-muted-foreground">Your cloud platform is ready. Create websites, deploy applications, and manage everything from one place.</p>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Services", value: `${runningServices}/${totalServices}`, icon: Zap, color: "text-accent" },
          { label: "Websites", value: stats.websites.toString(), icon: Globe, color: "text-accent" },
          { label: "Applications", value: apps.length.toString(), icon: Rocket, color: "text-accent" },
          { label: "Storage Used", value: formatMb(stats.storageMb), icon: HardDrive, color: "text-accent" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Plan Limits Preview */}
      {planInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> Plan Limits
              <span className="text-xs font-normal text-muted-foreground">({planInfo.name})</span>
            </h2>
            <Link to="/dashboard/usage">
              <Button variant="ghost" size="sm">View Details <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">{formatMb(stats.storageMb)} / {formatMb(planInfo.storage_mb)}</span>
              </div>
              <Progress value={Math.min((stats.storageMb / planInfo.storage_mb) * 100, 100)} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Databases</span>
                <span className="font-medium">— / {planInfo.max_databases}</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Email Accounts</span>
                <span className="font-medium">— / {planInfo.max_email_accounts}</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Unified Services List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base">Your Services</h2>
        </div>

        {allServices.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No services yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first website or deploy an application.</p>
            <div className="flex justify-center gap-3">
              <Link to="/dashboard/buy-hosting"><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button></Link>
              <Link to="/dashboard/applications"><Button variant="accent" size="sm"><Rocket className="w-4 h-4 mr-1" /> Deploy App</Button></Link>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {allServices.slice(0, 8).map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(service.status)}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{service.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                      service.type === "Website" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                    }`}>
                      {service.type}
                    </span>
                    {statusLabel(service.status)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display font-semibold text-base mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Globe, label: "New Website", to: "/dashboard/buy-hosting" },
            { icon: Rocket, label: "Deploy App", to: "/dashboard/applications" },
            { icon: Database, label: "Create Database", to: "/dashboard/databases" },
            { icon: Mail, label: "Create Email", to: "/dashboard/email" },
          ].map((action) => (
            <Link key={action.label} to={action.to} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <action.icon className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
