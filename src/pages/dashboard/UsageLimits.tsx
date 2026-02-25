import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, HardDrive, Wifi, Database, Mail, Globe, Loader2,
  ArrowUpCircle, CheckCircle2, Rocket, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const UsageLimits = () => {
  const { user } = useOutletContext<ContextType>();
  const { accounts, loading, userPlan, getStorageInfo } = usePlanLimits(user?.id);

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const plan = userPlan || (accounts.length > 0 ? (accounts[0] as any).hosting_plans : null);

  if (!plan && accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display font-semibold text-xl">Usage & Plan</h1>
          <p className="text-sm text-muted-foreground">Monitor your resource usage and plan limits</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No active plan</h3>
          <p className="text-muted-foreground mb-4">Purchase a hosting plan to get started.</p>
          <Link to="/dashboard/buy-hosting">
            <Button variant="accent">Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  const websiteCount = accounts.filter(a => a.hosting_type === "shared_hosting").length;
  const appCount = accounts.filter(a => a.hosting_type === "app_hosting").length;
  const totalStorage = accounts.reduce((s, a) => s + (a.storage_used_mb || 0), 0);

  const resources = [
    {
      label: "Websites",
      icon: Globe,
      used: websiteCount,
      total: plan?.max_domains || 0,
      display: `${websiteCount} / ${plan?.max_domains || 0}`,
      percent: plan?.max_domains > 0 ? Math.round((websiteCount / plan.max_domains) * 100) : 0,
      show: (plan?.plan_type === "shared" || plan?.plan_type === "hybrid"),
    },
    {
      label: "Applications",
      icon: Rocket,
      used: appCount,
      total: plan?.max_apps || 0,
      display: `${appCount} / ${plan?.max_apps || 0}`,
      percent: plan?.max_apps > 0 ? Math.round((appCount / plan.max_apps) * 100) : 0,
      show: (plan?.plan_type === "app" || plan?.plan_type === "hybrid"),
    },
    {
      label: "Storage",
      icon: HardDrive,
      used: totalStorage,
      total: plan?.storage_mb || 0,
      display: `${formatMb(totalStorage)} / ${formatMb(plan?.storage_mb || 0)}`,
      percent: plan?.storage_mb > 0 ? Math.round((totalStorage / plan.storage_mb) * 100) : 0,
      show: true,
    },
    {
      label: "Bandwidth",
      icon: Wifi,
      used: 0,
      total: plan?.bandwidth_mb || 0,
      display: `0 MB / ${formatMb(plan?.bandwidth_mb || 0)}`,
      percent: 0,
      show: true,
    },
    {
      label: "Databases",
      icon: Database,
      used: 0,
      total: plan?.max_databases || 0,
      display: `0 / ${plan?.max_databases || 0}`,
      percent: 0,
      show: (plan?.max_databases || 0) > 0,
    },
    {
      label: "Email Accounts",
      icon: Mail,
      used: 0,
      total: plan?.max_email_accounts || 0,
      display: `0 / ${plan?.max_email_accounts || 0}`,
      percent: 0,
      show: (plan?.max_email_accounts || 0) > 0,
    },
    {
      label: "RAM",
      icon: Cpu,
      used: 0,
      total: plan?.ram_mb || 0,
      display: `0 MB / ${plan?.ram_mb > 0 ? `${plan.ram_mb} MB` : "—"}`,
      percent: 0,
      show: (plan?.ram_mb || 0) > 0,
    },
  ].filter(r => r.show);

  const planTypeLabel = (t: string) => {
    if (t === "shared") return "Shared Hosting";
    if (t === "app") return "Application Hosting";
    return "Hybrid Cloud";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Usage & Plan</h1>
          <p className="text-sm text-muted-foreground">Monitor your resource usage and plan limits</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="outline" size="sm">
            <ArrowUpCircle className="w-4 h-4 mr-1" /> Upgrade Plan
          </Button>
        </Link>
      </div>

      {/* Plan Info Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl p-6 border border-accent/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl">{plan?.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{planTypeLabel(plan?.plan_type)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
        </div>
      </motion.div>

      {/* Resource Bars */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-6 space-y-6">
        <h3 className="font-display font-semibold text-base">Resource Usage</h3>
        {resources.map((res) => {
          const isNearLimit = res.percent >= 80;
          const isAtLimit = res.percent >= 100;
          return (
            <div key={res.label}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <res.icon className="w-4 h-4" />
                  {res.label}
                </span>
                <span className={`font-medium ${isAtLimit ? "text-destructive" : isNearLimit ? "text-warning" : ""}`}>
                  {res.display}
                </span>
              </div>
              <Progress
                value={Math.min(res.percent, 100)}
                className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-warning" : ""}`}
              />
              {isAtLimit && (
                <p className="text-xs text-destructive mt-1">
                  Limit reached. Upgrade your plan to add more.
                </p>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default UsageLimits;
