import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, HardDrive, Wifi, Database, Mail, Globe, Loader2,
  ArrowUpCircle, CheckCircle2,
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
  const { accounts, loading, getLimits, getStorageInfo } = usePlanLimits(user?.id);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [dbCounts, setDbCounts] = useState<Record<string, number>>({});

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display font-semibold text-xl">Usage & Limits</h1>
          <p className="text-sm text-muted-foreground">Monitor your resource usage and plan limits</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No active services</h3>
          <p className="text-muted-foreground mb-4">Purchase a hosting plan to view usage and limits.</p>
          <Link to="/dashboard/buy-hosting">
            <Button variant="accent">Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Usage & Limits</h1>
          <p className="text-sm text-muted-foreground">Monitor your resource usage and plan limits</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="outline" size="sm">
            <ArrowUpCircle className="w-4 h-4 mr-1" /> Upgrade Plan
          </Button>
        </Link>
      </div>

      {accounts.map((account, i) => {
        const limits = getLimits(account.domain);
        const storage = getStorageInfo(account.domain);
        if (!limits) return null;

        const resources = [
          {
            label: "Storage",
            icon: HardDrive,
            used: storage.used,
            total: storage.total,
            display: `${formatMb(storage.used)} / ${formatMb(storage.total)}`,
            percent: storage.percent,
          },
          {
            label: "Bandwidth",
            icon: Wifi,
            used: 0,
            total: limits.bandwidth_mb,
            display: `0 MB / ${formatMb(limits.bandwidth_mb)}`,
            percent: 0,
          },
          {
            label: "Databases",
            icon: Database,
            used: dbCounts[account.domain] || 0,
            total: limits.max_databases,
            display: `${dbCounts[account.domain] || 0} / ${limits.max_databases}`,
            percent: limits.max_databases > 0 ? Math.round(((dbCounts[account.domain] || 0) / limits.max_databases) * 100) : 0,
          },
          {
            label: "Email Accounts",
            icon: Mail,
            used: emailCounts[account.domain] || 0,
            total: limits.max_email_accounts,
            display: `${emailCounts[account.domain] || 0} / ${limits.max_email_accounts}`,
            percent: limits.max_email_accounts > 0 ? Math.round(((emailCounts[account.domain] || 0) / limits.max_email_accounts) * 100) : 0,
          },
          {
            label: "Domains",
            icon: Globe,
            used: 0,
            total: limits.max_domains,
            display: `— / ${limits.max_domains}`,
            percent: 0,
          },
        ];

        return (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.domain}</h3>
                    <p className="text-sm text-muted-foreground">{limits.name} Plan</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">Active</span>
              </div>
            </div>

            <div className="p-5 space-y-5">
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
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default UsageLimits;
