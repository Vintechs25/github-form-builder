import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Globe, Plus, ExternalLink, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; badgeClass: string; description: string }> = {
  active: { label: "Active", icon: CheckCircle2, badgeClass: "bg-success/10 text-success", description: "" },
  pending_dns: { label: "Awaiting DNS", icon: Clock, badgeClass: "bg-warning/10 text-warning", description: "Nameservers not yet pointed. Check My Hosting for instructions." },
  pending: { label: "Pending", icon: Clock, badgeClass: "bg-muted text-muted-foreground", description: "Your hosting is being set up." },
  suspended: { label: "Suspended", icon: AlertTriangle, badgeClass: "bg-destructive/10 text-destructive", description: "Account suspended. Contact support or check billing." },
  expired: { label: "Expired", icon: XCircle, badgeClass: "bg-destructive/10 text-destructive", description: "Hosting expired. Renew to restore your site." },
};

const getStatus = (status: string) => statusConfig[status] || { label: status, icon: Globe, badgeClass: "bg-muted text-muted-foreground", description: "" };

const Websites = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("hosting_accounts")
      .select("*, hosting_plans(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Websites</h1>
          <p className="text-sm text-muted-foreground">All your hosted websites</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No websites yet</h3>
          <p className="text-muted-foreground mb-4">Purchase a hosting plan to get started.</p>
          <Link to="/dashboard/buy-hosting">
            <Button variant="accent"><Plus className="w-4 h-4 mr-1" /> Buy Hosting</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((account, i) => {
            const s = getStatus(account.status);
            const Icon = s.icon;
            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.badgeClass.replace("text-", "bg-").split(" ")[0]}`}>
                      <Icon className={`w-5 h-5 ${s.badgeClass.split(" ")[1]}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{account.domain}</h3>
                      <p className="text-sm text-muted-foreground">{account.hosting_plans?.name || "Hosting"}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.badgeClass}`}>{s.label}</span>
                </div>

                {s.description && (
                  <p className="text-xs text-muted-foreground mb-3">{s.description}</p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  {account.status === "active" && (
                    <a href={`https://${account.domain}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="w-3 h-3 mr-1" /> Visit Site
                      </Button>
                    </a>
                  )}
                  <Link to="/dashboard/hosting" className="flex-1">
                    <Button variant="accent" size="sm" className="w-full">Manage</Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Websites;
