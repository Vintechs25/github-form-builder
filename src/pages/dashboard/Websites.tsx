import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Globe, Plus, ExternalLink, RefreshCw, CheckCircle2, Clock, Copy,
  Loader2, AlertTriangle, FolderOpen, Shield, Mail, Database,
  HardDrive, Wifi, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const copyNs = () => {
    navigator.clipboard.writeText(`${NS1}\n${NS2}`);
    toast.success("Nameservers copied!");
  };

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);
  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const getStatusBadge = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    if (status === "active") return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === "pending_dns") return <Clock className="w-5 h-5 text-warning" />;
    if (status === "suspended" || status === "expired") return <AlertTriangle className="w-5 h-5 text-destructive" />;
    return <Globe className="w-5 h-5 text-accent" />;
  };

  const getStatusBg = (status: string) => {
    if (status === "active") return "bg-success/10";
    if (status === "pending_dns") return "bg-warning/10";
    if (status === "suspended" || status === "expired") return "bg-destructive/10";
    return "bg-accent/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl">Websites</h1>
          <p className="text-sm text-muted-foreground">Manage your hosted websites with email, databases, and files</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button>
        </Link>
      </div>

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
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBg(account.status)}`}>
                        {getStatusIcon(account.status)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{account.domain}</h3>
                        <p className="text-sm text-muted-foreground">{plan?.name || "Website"}</p>
                      </div>
                    </div>
                    {getStatusBadge(account.status)}
                  </div>

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
                      <Button variant="accent" size="sm" className="flex-1" onClick={() => toggleExpand(account.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        {isExpanded ? "Hide" : "Manage"}
                      </Button>
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
