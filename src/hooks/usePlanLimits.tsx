import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlanLimits {
  name: string;
  plan_type: string;
  max_email_accounts: number;
  max_databases: number;
  max_domains: number;
  max_apps: number;
  ram_mb: number;
  storage_mb: number;
  bandwidth_mb: number;
}

interface HostingAccountWithPlan {
  id: string;
  domain: string;
  status: string;
  hosting_type: string;
  storage_used_mb: number;
  plan_id: string | null;
  hosting_plans: PlanLimits | null;
}

type ResourceType = "email" | "database" | "domain" | "website" | "app";

interface UsePlanLimitsReturn {
  accounts: HostingAccountWithPlan[];
  loading: boolean;
  userPlan: PlanLimits | null;
  getLimits: (domain: string) => PlanLimits | null;
  canCreate: (resource: ResourceType, currentCount: number, domain?: string) => { allowed: boolean; limit: number; used: number; message: string };
  getStorageInfo: (domain: string) => { used: number; total: number; percent: number };
}

export const usePlanLimits = (userId: string | undefined): UsePlanLimitsReturn => {
  const [accounts, setAccounts] = useState<HostingAccountWithPlan[]>([]);
  const [userPlan, setUserPlan] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const [{ data: accts }, { data: profile }] = await Promise.all([
        supabase
          .from("hosting_accounts")
          .select("id, domain, status, hosting_type, storage_used_mb, plan_id, hosting_plans(name, plan_type, max_email_accounts, max_databases, max_domains, max_apps, ram_mb, storage_mb, bandwidth_mb)")
          .eq("user_id", userId)
          .eq("status", "active"),
        supabase
          .from("profiles")
          .select("plan_id, hosting_plans:plan_id(name, plan_type, max_email_accounts, max_databases, max_domains, max_apps, ram_mb, storage_mb, bandwidth_mb)")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      setAccounts((accts as any) || []);
      setUserPlan((profile as any)?.hosting_plans || null);
      setLoading(false);
    };

    load();
  }, [userId]);

  const getLimits = useCallback((domain: string): PlanLimits | null => {
    const account = accounts.find((a) => a.domain === domain);
    return account?.hosting_plans || userPlan || null;
  }, [accounts, userPlan]);

  const canCreate = useCallback((resource: ResourceType, currentCount: number, domain?: string) => {
    // Use account-level plan or user-level plan
    const limits = domain ? getLimits(domain) : userPlan;
    if (!limits) return { allowed: false, limit: 0, used: currentCount, message: "No active plan. Purchase a plan to continue." };

    const limitMap: Record<ResourceType, number> = {
      email: limits.max_email_accounts,
      database: limits.max_databases,
      domain: limits.max_domains,
      website: limits.max_domains,
      app: limits.max_apps,
    };
    const labelMap: Record<ResourceType, string> = {
      email: "email accounts",
      database: "databases",
      domain: "domains",
      website: "websites",
      app: "applications",
    };

    const limit = limitMap[resource];

    // If plan doesn't support this resource type at all
    if (limit === 0) {
      return {
        allowed: false,
        limit: 0,
        used: currentCount,
        message: `Your ${limits.name} plan doesn't include ${labelMap[resource]}. Upgrade to a plan that supports this feature.`,
      };
    }

    const allowed = currentCount < limit;
    const message = allowed
      ? `${currentCount} of ${limit} ${labelMap[resource]} used`
      : `You've reached the maximum of ${limit} ${labelMap[resource]} on your ${limits.name} plan. Upgrade to add more.`;

    return { allowed, limit, used: currentCount, message };
  }, [getLimits, userPlan]);

  const getStorageInfo = useCallback((domain: string) => {
    const account = accounts.find((a) => a.domain === domain);
    const used = account?.storage_used_mb || 0;
    const total = account?.hosting_plans?.storage_mb || userPlan?.storage_mb || 0;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
    return { used, total, percent };
  }, [accounts, userPlan]);

  return { accounts, loading, userPlan, getLimits, canCreate, getStorageInfo };
};
