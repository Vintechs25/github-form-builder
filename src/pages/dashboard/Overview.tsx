import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Globe, Database, Mail, ChevronRight, Plus, Clock, CheckCircle2,
  AlertTriangle, Rocket, BarChart3, HardDrive, Zap, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import * as coolify from "@/services/coolifyService";
import type { User } from "@supabase/supabase-js";

interface ContextType {
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
  user: User | null;
}

const Overview = () => {
  const { profile, user } = useOutletContext<ContextType>();
  const { accounts, userPlan, canCreate } = usePlanLimits(user?.id);
  const [hostingAccounts, setHostingAccounts] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [stats, setStats] = useState({
    websites: 0, applications: 0, pendingDns: 0, storageMb: 0, tickets: 0,
    databases: 0, emails: 0,
  });

  const plan = userPlan || (accounts.length > 0 ? (accounts[0] as any).hosting_plans : null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: accts }, { data: tickets }, { data: orders }] = await Promise.all([
        supabase.from("hosting_accounts").select("*, hosting_plans(*)").eq("user_id", user.id),
        supabase.from("support_tickets").select("id").eq("user_id", user.id).in("status", ["open", "in_progress"]),
        supabase.from("orders").select("created_at, billing_cycle, status").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1),
      ]);

      const all = accts || [];
      setHostingAccounts(all);

      // Calculate renewal date from most recent active order
      if (orders && orders.length > 0) {
        const order = orders[0];
        const created = new Date(order.created_at);
        const months = order.billing_cycle === "yearly" ? 12 : 1;
        const renewal = new Date(created);
        renewal.setMonth(renewal.getMonth() + months);
        setRenewalDate(renewal.toLocaleDateString());
      }

      try {
        const appsRes = await coolify.listApps();
        setApps(Array.isArray(appsRes) ? appsRes : []);
      } catch { setApps([]); }

      setStats({
        websites: all.filter(a => a.status === "active" && a.hosting_type === "shared_hosting").length,
        applications: 0,
        pendingDns: all.filter(a => a.status === "pending_dns").length,
        storageMb: all.reduce((s, a) => s + (a.storage_used_mb || 0), 0),
        tickets: tickets?.length || 0,
        databases: 0,
        emails: 0,
      });
    };
    load();
  }, [user]);

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      applications: apps.filter(a => (a.status || "").toLowerCase().includes("running")).length,
    }));
  }, [apps]);

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  const totalServices = stats.websites + apps.length;
  const runningServices = stats.websites + stats.applications;

  const allServices = [
    ...hostingAccounts
      .filter(a => ["active", "pending_dns", "suspended"].includes(a.status))
      .map(a => ({
        id: a.id, name: a.domain, type: "Website" as const,
        status: a.status === "active" ? "running" : a.status === "pending_dns" ? "pending" : "stopped",
        domain: a.domain,
      })),
    ...apps.map(a => ({
      id: a.uuid, name: a.name || a.uuid, type: "Application" as const,
      status: (a.status || "").toLowerCase().includes("running") ? "running"
        : (a.status || "").toLowerCase().includes("building") ? "building" : "stopped",
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

  // Check plan capabilities for quick action buttons
  const canCreateWebsite = !plan || plan.plan_type === "shared" || plan.plan_type === "hybrid";
  const canDeployApp = !plan || plan.plan_type === "app" || plan.plan_type === "hybrid";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your cloud hosting overview</p>
        </div>
        <div className="flex gap-2">
          {canCreateWebsite && (
            <Link to="/dashboard/websites">
              <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button>
            </Link>
          )}
          {canDeployApp && (
            <Link to="/dashboard/applications">
              <Button variant="accent" size="sm"><Rocket className="w-4 h-4 mr-1" /> Deploy App</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Suspension alert */}
      {hostingAccounts.filter(a => a.status === "suspended").length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                {hostingAccounts.filter(a => a.status === "suspended").length} service(s) suspended
              </p>
              <p className="text-sm text-muted-foreground mt-1">Suspended due to an overdue invoice.</p>
              <Link to="/dashboard/billing">
                <Button variant="destructive" size="sm" className="mt-3">Pay Now <ChevronRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl p-6 border border-accent/20">
        <h2 className="font-display font-bold text-xl mb-2">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}! 👋
        </h2>
        <p className="text-muted-foreground">
          {plan ? `You're on the ${plan.name} plan. ` : ""}
          Create websites, deploy applications, and manage everything from one place.
        </p>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Websites", value: stats.websites.toString(), icon: Globe, color: "text-accent" },
          { label: "Applications", value: apps.length.toString(), icon: Rocket, color: "text-accent" },
          { label: "Databases", value: stats.databases?.toString() || "0", icon: Database, color: "text-accent" },
          { label: "Emails", value: stats.emails?.toString() || "0", icon: Mail, color: "text-accent" },
          { label: "Current Plan", value: plan?.name || "None", icon: Zap, color: "text-accent" },
          { label: "Renewal Date", value: renewalDate || "—", icon: Clock, color: "text-accent" },
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
      {plan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> Plan Limits
              <span className="text-xs font-normal text-muted-foreground">({plan.name})</span>
            </h2>
            <Link to="/dashboard/usage">
              <Button variant="ghost" size="sm">View Details <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">{formatMb(stats.storageMb)} / {formatMb(plan.storage_mb)}</span>
              </div>
              <Progress value={Math.min((stats.storageMb / plan.storage_mb) * 100, 100)} className="h-2" />
            </div>
            {plan.max_domains > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Websites</span>
                  <span className="font-medium">{stats.websites} / {plan.max_domains}</span>
                </div>
                <Progress value={Math.min((stats.websites / plan.max_domains) * 100, 100)} className="h-2" />
              </div>
            )}
            {plan.max_apps > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium">{apps.length} / {plan.max_apps}</span>
                </div>
                <Progress value={Math.min((apps.length / plan.max_apps) * 100, 100)} className="h-2" />
              </div>
            )}
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
              {canCreateWebsite && <Link to="/dashboard/buy-hosting"><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button></Link>}
              {canDeployApp && <Link to="/dashboard/applications"><Button variant="accent" size="sm"><Rocket className="w-4 h-4 mr-1" /> Deploy App</Button></Link>}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {allServices.slice(0, 8).map((service, i) => (
                <motion.div key={service.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
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
                    }`}>{service.type}</span>
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
            { icon: Globe, label: "New Website", to: "/dashboard/buy-hosting", show: canCreateWebsite },
            { icon: Rocket, label: "Deploy App", to: "/dashboard/applications", show: canDeployApp },
            { icon: Database, label: "Create Database", to: "/dashboard/databases", show: true },
            { icon: Mail, label: "Create Email", to: "/dashboard/email", show: canCreateWebsite },
          ].filter(a => a.show).map((action) => (
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
