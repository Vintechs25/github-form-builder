import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Globe, Plus, ExternalLink, RefreshCw, CheckCircle2, Clock, Copy,
  Loader2, AlertTriangle, FolderOpen, Shield, Mail, Database,
  HardDrive, Wifi, ChevronDown, ChevronUp, XCircle, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

interface SiteStatus {
  checking: boolean;
  live: boolean | null;
  responseTime: number | null;
  error: string | null;
  lastChecked: Date | null;
}

const NS1 = "ns1.vintechdev.store";
const NS2 = "ns2.vintechdev.store";

const checkSiteStatus = async (domain: string): Promise<{ live: boolean; responseTime: number; error: string | null }> => {
  const start = performance.now();
  try {
    // Use a lightweight HEAD-like fetch via an image or fetch with no-cors
    // We try fetching the domain — if it responds, it's live
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const elapsed = Math.round(performance.now() - start);
    // no-cors returns opaque response (status 0) but if it doesn't throw, the server responded
    return { live: true, responseTime: elapsed, error: null };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - start);
    if (err.name === "AbortError") {
      return { live: false, responseTime: elapsed, error: "Timeout (10s)" };
    }
    return { live: false, responseTime: elapsed, error: "Unreachable" };
  }
};

const Websites = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingDns, setCheckingDns] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [siteStatuses, setSiteStatuses] = useState<Record<string, SiteStatus>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uptimePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Real-time uptime checks for active sites
  const checkAllSites = useCallback(async () => {
    const activeSites = accounts.filter(a => a.status === "active");
    if (activeSites.length === 0) return;

    // Mark all as checking
    setSiteStatuses(prev => {
      const next = { ...prev };
      activeSites.forEach(a => {
        next[a.id] = { ...next[a.id], checking: true, live: next[a.id]?.live ?? null, responseTime: next[a.id]?.responseTime ?? null, error: next[a.id]?.error ?? null, lastChecked: next[a.id]?.lastChecked ?? null };
      });
      return next;
    });

    // Check all in parallel
    const results = await Promise.all(
      activeSites.map(async (a) => {
        const result = await checkSiteStatus(a.domain);
        return { id: a.id, ...result };
      })
    );

    setSiteStatuses(prev => {
      const next = { ...prev };
      results.forEach(r => {
        next[r.id] = {
          checking: false,
          live: r.live,
          responseTime: r.responseTime,
          error: r.error,
          lastChecked: new Date(),
        };
      });
      return next;
    });
  }, [accounts]);

  // Initial check + polling every 30s
  useEffect(() => {
    const activeSites = accounts.filter(a => a.status === "active");
    if (activeSites.length === 0) return;

    checkAllSites();
    uptimePollRef.current = setInterval(checkAllSites, 30000);
    return () => { if (uptimePollRef.current) { clearInterval(uptimePollRef.current); uptimePollRef.current = null; } };
  }, [accounts.filter(a => a.status === "active").map(a => a.id).join(",")]);

  const pendingDnsIds = accounts.filter((a) => a.status === "pending_dns").map((a) => a.id).join(",");

  useEffect(() => {
    const pending = accounts.filter((a) => a.status === "pending_dns");
    if (pending.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const checkAll = () => pending.forEach((a) => checkDns(a, true));
    checkAll();
    pollRef.current = setInterval(checkAll, 30000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [pendingDnsIds]);

  const checkDns = async (account: any, silent = false) => {
    setCheckingDns((prev) => ({ ...prev, [account.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("check-dns", {
        body: { domain: account.domain, hosting_account_id: account.id },
      });
      if (error) { if (!silent) toast.error("DNS check failed"); return; }
      if (data?.pointed) {
        if (data.provisioned || data.hosting_status === "active") {
          toast.success(`🎉 ${account.domain} is now active!`);
          fetchAccounts();
        } else if (!silent) {
          toast.info("DNS pointed. Provisioning in progress...");
          fetchAccounts();
        }
      } else if (!silent) {
        toast.info(`DNS not yet pointed. Current: ${(data?.current_nameservers || []).join(", ") || "none detected"}`);
      }
    } catch { if (!silent) toast.error("DNS check failed"); }
    finally { setCheckingDns((prev) => ({ ...prev, [account.id]: false })); }
  };

  const checkSingleSite = async (accountId: string, domain: string) => {
    setSiteStatuses(prev => ({
      ...prev,
      [accountId]: { ...prev[accountId], checking: true, live: prev[accountId]?.live ?? null, responseTime: prev[accountId]?.responseTime ?? null, error: prev[accountId]?.error ?? null, lastChecked: prev[accountId]?.lastChecked ?? null },
    }));
    const result = await checkSiteStatus(domain);
    setSiteStatuses(prev => ({
      ...prev,
      [accountId]: { checking: false, live: result.live, responseTime: result.responseTime, error: result.error, lastChecked: new Date() },
    }));
  };

  const copyNs = () => {
    navigator.clipboard.writeText(`${NS1}\n${NS2}`);
    toast.success("Nameservers copied!");
  };

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const getStatusBadge = (status: string, accountId?: string) => {
    // For active sites, show live/down status from uptime check
    if (status === "active" && accountId) {
      const site = siteStatuses[accountId];
      if (site?.checking) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Checking
          </span>
        );
      }
      if (site?.live === true) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live · {site.responseTime}ms
          </span>
        );
      }
      if (site?.live === false) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Down {site.error ? `· ${site.error}` : ""}
          </span>
        );
      }
      // Not yet checked
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">Running</span>;
    }

    const map: Record<string, { label: string; cls: string }> = {
      active: { label: "Running", cls: "bg-success/10 text-success" },
      pending_dns: { label: "Pending DNS", cls: "bg-warning/10 text-warning" },
      pending: { label: "Awaiting Payment", cls: "bg-muted text-muted-foreground" },
      suspended: { label: "Suspended", cls: "bg-destructive/10 text-destructive" },
      expired: { label: "Expired", cls: "bg-destructive/10 text-destructive" },
    };
    const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  const getStatusIcon = (status: string, accountId?: string) => {
    if (status === "active" && accountId) {
      const site = siteStatuses[accountId];
      if (site?.checking) return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
      if (site?.live === true) return <CheckCircle2 className="w-5 h-5 text-success" />;
      if (site?.live === false) return <XCircle className="w-5 h-5 text-destructive" />;
    }
    if (status === "active") return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === "pending_dns") return <Clock className="w-5 h-5 text-warning" />;
    if (status === "suspended" || status === "expired") return <AlertTriangle className="w-5 h-5 text-destructive" />;
    return <Globe className="w-5 h-5 text-accent" />;
  };

  const getStatusBg = (status: string, accountId?: string) => {
    if (status === "active" && accountId) {
      const site = siteStatuses[accountId];
      if (site?.live === false) return "bg-destructive/10";
      return "bg-success/10";
    }
    if (status === "active") return "bg-success/10";
    if (status === "pending_dns") return "bg-warning/10";
    if (status === "suspended" || status === "expired") return "bg-destructive/10";
    return "bg-accent/10";
  };

  // Count live/down sites
  const activeSites = accounts.filter(a => a.status === "active");
  const liveSites = activeSites.filter(a => siteStatuses[a.id]?.live === true).length;
  const downSites = activeSites.filter(a => siteStatuses[a.id]?.live === false).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Websites</h1>
          <p className="text-sm text-muted-foreground">Manage your hosted websites with email, databases, and files</p>
        </div>
        <div className="flex gap-2">
          {activeSites.length > 0 && (
            <Button variant="outline" size="sm" onClick={checkAllSites} disabled={Object.values(siteStatuses).some(s => s.checking)}>
              <Activity className="w-4 h-4 mr-1" /> Check All
            </Button>
          )}
          <Link to="/dashboard/buy-hosting">
            <Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button>
          </Link>
        </div>
      </div>

      {/* Uptime summary banner */}
      {activeSites.length > 0 && (liveSites > 0 || downSites > 0) && (
        <div className={`rounded-lg p-4 flex items-center gap-3 ${downSites > 0 ? "bg-destructive/5 border border-destructive/20" : "bg-success/5 border border-success/20"}`}>
          <Activity className={`w-5 h-5 shrink-0 ${downSites > 0 ? "text-destructive" : "text-success"}`} />
          <div className="text-sm flex-1">
            {downSites > 0 ? (
              <p className="font-medium text-destructive">
                {downSites} site{downSites > 1 ? "s" : ""} down · {liveSites} live
              </p>
            ) : (
              <p className="font-medium text-success">
                All {liveSites} site{liveSites > 1 ? "s" : ""} live ✓
              </p>
            )}
            <p className="text-muted-foreground text-xs mt-0.5">Auto-checking every 30 seconds</p>
          </div>
        </div>
      )}

      {/* Nameserver banner for pending_dns */}
      {accounts.some((a) => a.status === "pending_dns") && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
          <Globe className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-medium text-foreground">Point your domains to activate</p>
            <p className="text-muted-foreground mt-1">Set your domain's nameservers at your registrar to:</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <code className="bg-secondary px-2 py-1 rounded text-xs font-mono font-semibold text-foreground">{NS1}</code>
              <code className="bg-secondary px-2 py-1 rounded text-xs font-mono font-semibold text-foreground">{NS2}</code>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyNs}>
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No websites yet</h3>
          <p className="text-muted-foreground mb-4">Create a website to get email, databases, file hosting, and SSL.</p>
          <Link to="/dashboard/buy-hosting">
            <Button variant="accent"><Plus className="w-4 h-4 mr-1" /> Create Website</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account, i) => {
            const plan = account.hosting_plans;
            const isExpanded = expanded[account.id];
            const site = siteStatuses[account.id];

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBg(account.status, account.id)}`}>
                        {getStatusIcon(account.status, account.id)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{account.domain}</h3>
                        <p className="text-sm text-muted-foreground">{plan?.name || "Website"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(account.status, account.id)}
                      {account.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => checkSingleSite(account.id, account.domain)}
                          disabled={site?.checking}
                          title="Check status"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${site?.checking ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Down alert for active sites */}
                  {account.status === "active" && site?.live === false && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-destructive flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Website is not responding
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {site.error || "Could not reach your website."} — Response time: {site.responseTime}ms
                      </p>
                      {site.lastChecked && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last checked: {site.lastChecked.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}

                  {account.status === "pending" && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">💳 Payment Required</p>
                      <p className="text-xs text-muted-foreground mb-3">Complete payment to activate your website.</p>
                      <Link to="/dashboard/billing"><Button variant="accent" size="sm">Pay Now</Button></Link>
                    </div>
                  )}

                  {account.status === "pending_dns" && (
                    <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">⏳ Waiting for DNS propagation</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Update your domain's nameservers to <span className="font-mono font-semibold">{NS1}</span> and{" "}
                        <span className="font-mono font-semibold">{NS2}</span>. Propagation can take up to 48 hours.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => checkDns(account)} disabled={checkingDns[account.id]}>
                        {checkingDns[account.id] ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking...</>
                        ) : (
                          <><RefreshCw className="w-3 h-3 mr-1" /> Check Now</>
                        )}
                      </Button>
                    </div>
                  )}

                  {account.status === "suspended" && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-destructive mb-2">⚠ Service Suspended</p>
                      <p className="text-xs text-muted-foreground mb-3">Suspended due to an overdue invoice. Pay now to restore service.</p>
                      <Link to="/dashboard/billing"><Button variant="destructive" size="sm">Pay Overdue Invoice</Button></Link>
                    </div>
                  )}

                  {account.status === "expired" && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-destructive mb-2">⏰ Service Expired</p>
                      <p className="text-xs text-muted-foreground mb-3">This service has expired. Renew to continue.</p>
                      <Link to="/dashboard/billing"><Button variant="destructive" size="sm">Renew</Button></Link>
                    </div>
                  )}

                  {account.status === "active" && (
                    <div className="flex items-center gap-2">
                      <a href={`https://${account.domain}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="w-3 h-3 mr-1" /> Visit Site
                        </Button>
                      </a>
                      <Link to={`/dashboard/websites/${account.id}`}>
                        <Button variant="accent" size="sm" className="flex-1 w-full">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {account.status === "active" && isExpanded && plan && (
                  <div className="border-t border-border p-5 bg-muted/30 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Storage</span>
                          <span className="font-medium">{formatMb(account.storage_used_mb)} / {formatMb(plan.storage_mb)}</span>
                        </div>
                        <Progress value={Math.min((account.storage_used_mb / plan.storage_mb) * 100, 100)} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Bandwidth</span>
                          <span className="font-medium">{formatMb(0)} / {formatMb(plan.bandwidth_mb)}</span>
                        </div>
                        <Progress value={0} className="h-2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Link to="/dashboard/files" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border hover:border-accent/30 hover:shadow-sm transition-all">
                        <FolderOpen className="w-5 h-5 text-accent" />
                        <span className="text-xs font-medium">Files</span>
                      </Link>
                      <Link to="/dashboard/security" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border hover:border-accent/30 hover:shadow-sm transition-all">
                        <Shield className="w-5 h-5 text-accent" />
                        <span className="text-xs font-medium">SSL</span>
                        {account.ssl_enabled && <span className="text-[10px] text-success font-medium">🔒 Active</span>}
                      </Link>
                      {plan.max_email_accounts > 0 && (
                        <Link to="/dashboard/email" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border hover:border-accent/30 hover:shadow-sm transition-all">
                          <Mail className="w-5 h-5 text-accent" />
                          <span className="text-xs font-medium">Email</span>
                          <span className="text-[10px] text-muted-foreground">Max {plan.max_email_accounts}</span>
                        </Link>
                      )}
                      {plan.max_databases > 0 && (
                        <Link to="/dashboard/databases" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card border border-border hover:border-accent/30 hover:shadow-sm transition-all">
                          <Database className="w-5 h-5 text-accent" />
                          <span className="text-xs font-medium">Databases</span>
                          <span className="text-[10px] text-muted-foreground">Max {plan.max_databases}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Websites;
