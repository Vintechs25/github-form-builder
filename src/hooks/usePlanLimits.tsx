import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlanLimits {
  name: string;
  max_email_accounts: number;
  max_databases: number;
  max_domains: number;
  storage_mb: number;
  bandwidth_mb: number;
}

interface HostingAccountWithPlan {
  id: string;
  domain: string;
  status: string;
  storage_used_mb: number;
  plan_id: string | null;
  hosting_plans: PlanLimits | null;
}

interface UsePlanLimitsReturn {
  accounts: HostingAccountWithPlan[];
  loading: boolean;
  getLimits: (domain: string) => PlanLimits | null;
  canCreate: (domain: string, resource: "email" | "database" | "domain", currentCount: number) => { allowed: boolean; limit: number; used: number; message: string };
  getStorageInfo: (domain: string) => { used: number; total: number; percent: number };
}

export const usePlanLimits = (userId: string | undefined): UsePlanLimitsReturn => {
  const [accounts, setAccounts] = useState<HostingAccountWithPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from("hosting_accounts")
      .select("id, domain, status, storage_used_mb, plan_id, hosting_plans(name, max_email_accounts, max_databases, max_domains, storage_mb, bandwidth_mb)")
      .eq("user_id", userId)
      .eq("status", "active")
      .then(({ data }) => {
        setAccounts((data as any) || []);
        setLoading(false);
      });
  }, [userId]);

  const getLimits = useCallback((domain: string): PlanLimits | null => {
    const account = accounts.find((a) => a.domain === domain);
    return account?.hosting_plans || null;
  }, [accounts]);

  const canCreate = useCallback((domain: string, resource: "email" | "database" | "domain", currentCount: number) => {
    const limits = getLimits(domain);
    if (!limits) return { allowed: true, limit: 0, used: currentCount, message: "" };

    const limitMap = {
      email: limits.max_email_accounts,
      database: limits.max_databases,
      domain: limits.max_domains,
    };
    const labelMap = {
      email: "email accounts",
      database: "databases",
      domain: "domains",
    };

    const limit = limitMap[resource];
    const allowed = currentCount < limit;
    const message = allowed
      ? `${currentCount} of ${limit} ${labelMap[resource]} used`
      : `You've reached the maximum of ${limit} ${labelMap[resource]} on your ${limits.name} plan. Upgrade to add more.`;

    return { allowed, limit, used: currentCount, message };
  }, [getLimits]);

  const getStorageInfo = useCallback((domain: string) => {
    const account = accounts.find((a) => a.domain === domain);
    const used = account?.storage_used_mb || 0;
    const total = account?.hosting_plans?.storage_mb || 0;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
    return { used, total, percent };
  }, [accounts]);

  return { accounts, loading, getLimits, canCreate, getStorageInfo };
};
