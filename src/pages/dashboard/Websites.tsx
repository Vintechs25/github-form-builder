import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Globe, Plus, ExternalLink, RefreshCw, CheckCircle2, Clock, Copy, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const NS1 = "ns1.vintechdev.store";
const NS2 = "ns2.vintechdev.store";

const Websites = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingDns, setCheckingDns] = useState<Record<string, boolean>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("hosting_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Auto-poll DNS for pending_dns accounts every 30 seconds
  const pendingDnsAccounts = accounts.filter((a) => a.status === "pending_dns");

  useEffect(() => {
    if (pendingDnsAccounts.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const checkAll = () => {
      pendingDnsAccounts.forEach((account) => {
        checkDns(account, true);
      });
    };

    // Check immediately on mount
    checkAll();

    // Then poll every 30 seconds
    pollRef.current = setInterval(checkAll, 30000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [pendingDnsAccounts.map((a) => a.id).join(",")]);

  const checkDns = async (account: any, silent = false) => {
    setCheckingDns((prev) => ({ ...prev, [account.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("check-dns", {
        body: {
          domain: account.domain,
          hosting_account_id: account.id,
        },
      });

      if (error) {
        if (!silent) toast.error("DNS check failed");
        return;
      }

      if (data?.pointed) {
        if (data.provisioned || data.hosting_status === "active") {
          toast.success(`🎉 ${account.domain} is now active!`);
          fetchAccounts();
        } else if (!silent) {
          toast.info("Nameservers are pointed correctly. Provisioning in progress...");
          fetchAccounts();
        }
      } else if (!silent) {
        toast.info(
          `Nameservers not yet pointed. Current: ${(data?.current_nameservers || []).join(", ") || "none detected"}`
        );
      }
    } catch {
      if (!silent) toast.error("DNS check failed");
    } finally {
      setCheckingDns((prev) => ({ ...prev, [account.id]: false }));
    }
  };

  const copyNs = () => {
    navigator.clipboard.writeText(`${NS1}\n${NS2}`);
    toast.success("Nameservers copied!");
  };

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Websites</h1>
          <p className="text-sm text-muted-foreground">Manage your hosting accounts</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button>
        </Link>
      </div>

      {/* Nameserver banner */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
        <Globe className="w-5 h-5 text-accent mt-0.5 shrink-0" />
        <div className="text-sm flex-1">
          <p className="font-medium text-foreground">Point your domains to our nameservers</p>
          <p className="text-muted-foreground mt-1">
            For hosting to be active, set your domain's nameservers to:
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <code className="bg-secondary px-2 py-1 rounded text-xs font-mono font-semibold text-foreground">{NS1}</code>
            <code className="bg-secondary px-2 py-1 rounded text-xs font-mono font-semibold text-foreground">{NS2}</code>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyNs}>
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
        </div>
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
          {accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    account.status === "active" ? "bg-success/10" :
                    account.status === "suspended" ? "bg-destructive/10" :
                    account.status === "pending_dns" ? "bg-warning/10" : "bg-accent/10"
                  }`}>
                    {account.status === "suspended" ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : account.status === "pending_dns" ? (
                      <Clock className="w-5 h-5 text-warning" />
                    ) : account.status === "active" ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <Globe className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.domain}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{account.hosting_type?.replace("_", " ")}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  account.status === "active" ? "bg-success/10 text-success" :
                  account.status === "pending_dns" ? "bg-warning/10 text-warning" :
                  account.status === "pending" ? "bg-muted text-muted-foreground" :
                  "bg-destructive/10 text-destructive"
                }`}>
                  {account.status === "pending_dns" ? "Awaiting DNS" : account.status}
                </span>
              </div>

              {/* Pending DNS card */}
              {account.status === "pending_dns" && (
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-foreground mb-2">⏳ Waiting for nameserver propagation</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Update your domain's nameservers at your registrar to:
                  </p>
                  <div className="space-y-1 mb-3">
                    <div className="bg-secondary rounded px-3 py-1.5 text-xs font-mono font-semibold">{NS1}</div>
                    <div className="bg-secondary rounded px-3 py-1.5 text-xs font-mono font-semibold">{NS2}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    DNS propagation can take up to 48 hours. We're checking automatically every 30 seconds.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkDns(account)}
                    disabled={checkingDns[account.id]}
                  >
                    {checkingDns[account.id] ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking...</>
                    ) : (
                      <><RefreshCw className="w-3 h-3 mr-1" /> Check Now</>
                    )}
                  </Button>
                </div>
              )}

              {/* Suspended card */}
              {account.status === "suspended" && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-destructive mb-2">⚠ Hosting Suspended</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    This hosting account has been suspended due to an overdue invoice. Pay now to restore service.
                  </p>
                  <Link to="/dashboard/billing">
                    <Button variant="destructive" size="sm">Pay Overdue Invoice</Button>
                  </Link>
                </div>
              )}

              {/* Active hosting stats */}
              {account.status === "active" && (
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Storage</span>
                      <span>{formatMb(account.storage_used_mb)} / 5 GB</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((account.storage_used_mb / 5120) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Bandwidth</span>
                      <span>{formatMb(account.bandwidth_used_mb)} / 50 GB</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((account.bandwidth_used_mb / 51200) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                {account.status === "active" && (
                  <>
                    <Button variant="outline" size="sm" className="flex-1">File Manager</Button>
                    {account.hosting_type === "wordpress" && (
                      <Button variant="accent" size="sm" className="flex-1">
                        <ExternalLink className="w-3 h-3 mr-1" /> WordPress
                      </Button>
                    )}
                    {account.ssl_enabled && <span className="text-xs text-success font-medium">🔒 SSL</span>}
                  </>
                )}
                {account.status === "pending_dns" && (
                  <p className="text-xs text-muted-foreground">
                    Hosting will activate automatically once DNS is verified.
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Websites;
