import { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe, Shield, Mail, Database, FolderOpen, ArrowLeft, ExternalLink,
  CheckCircle2, XCircle, Loader2, RefreshCw, HardDrive, Wifi, Copy,
  Plus, Trash2, Key, Lock, AlertTriangle, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { issueSSL, listDatabases, createDatabase, deleteDatabase, listEmails, createEmail, deleteEmail, changeEmailPassword } from "@/services/hostingService";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const WebsiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const { canCreate } = usePlanLimits(user?.id);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [siteStatus, setSiteStatus] = useState<{ live: boolean | null; checking: boolean; responseTime: number | null }>({ live: null, checking: false, responseTime: null });

  // Databases
  const [databases, setDatabases] = useState<any[]>([]);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [newDb, setNewDb] = useState({ name: "", username: "", password: "" });
  const [creatingDb, setCreatingDb] = useState(false);

  // Emails
  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({ username: "", password: "" });
  const [creatingEmail, setCreatingEmail] = useState(false);

  // SSL
  const [issuingSSL, setIssuingSSL] = useState(false);

  // Domains
  const [domains, setDomains] = useState<any[]>([]);

  const fetchAccount = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("hosting_accounts")
      .select("*, hosting_plans(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setAccount(data);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  // Check site status
  const checkSite = useCallback(async () => {
    if (!account || account.status !== "active") return;
    setSiteStatus(prev => ({ ...prev, checking: true }));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const start = performance.now();
      await fetch(`https://${account.domain}`, { method: "HEAD", mode: "no-cors", signal: controller.signal });
      clearTimeout(timeout);
      setSiteStatus({ live: true, checking: false, responseTime: Math.round(performance.now() - start) });
    } catch {
      setSiteStatus({ live: false, checking: false, responseTime: null });
    }
  }, [account]);

  useEffect(() => { checkSite(); }, [checkSite]);

  // Fetch databases
  const fetchDbs = useCallback(async () => {
    if (!account?.domain) return;
    setLoadingDbs(true);
    try {
      const result = await listDatabases(account.domain);
      setDatabases(result?.data?.data ? JSON.parse(result.data.data) : []);
    } catch { setDatabases([]); }
    setLoadingDbs(false);
  }, [account?.domain]);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    if (!account?.domain) return;
    setLoadingEmails(true);
    try {
      const result = await listEmails(account.domain);
      const data = result?.data?.data ? JSON.parse(result.data.data) : result?.data || [];
      setEmails(Array.isArray(data) ? data : []);
    } catch { setEmails([]); }
    setLoadingEmails(false);
  }, [account?.domain]);

  // Fetch domains
  const fetchDomains = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("domains").select("*").eq("user_id", user.id);
    setDomains(data || []);
  }, [user]);

  useEffect(() => {
    if (account) {
      fetchDbs();
      fetchEmails();
      fetchDomains();
    }
  }, [account, fetchDbs, fetchEmails, fetchDomains]);

  const plan = account?.hosting_plans;
  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  const handleCreateDb = async () => {
    if (!newDb.name || !newDb.username || !newDb.password) { toast.error("All fields required"); return; }
    setCreatingDb(true);
    try {
      await createDatabase(account.domain, newDb.name, newDb.username, newDb.password);
      toast.success("Database created");
      setDbDialogOpen(false);
      setNewDb({ name: "", username: "", password: "" });
      fetchDbs();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    setCreatingDb(false);
  };

  const handleCreateEmail = async () => {
    if (!newEmail.username || !newEmail.password) { toast.error("All fields required"); return; }
    setCreatingEmail(true);
    try {
      await createEmail(account.domain, newEmail.username, newEmail.password);
      toast.success("Email created");
      setEmailDialogOpen(false);
      setNewEmail({ username: "", password: "" });
      fetchEmails();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    setCreatingEmail(false);
  };

  const handleIssueSSL = async () => {
    setIssuingSSL(true);
    try {
      await issueSSL(account.domain);
      await supabase.from("hosting_accounts").update({ ssl_enabled: true }).eq("id", account.id);
      setAccount((prev: any) => ({ ...prev, ssl_enabled: true }));
      toast.success("SSL certificate issued!");
    } catch (err: any) { toast.error(err.message || "Failed"); }
    setIssuingSSL(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/websites")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="text-center py-12 text-muted-foreground">Website not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/websites")}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="font-display font-semibold text-xl flex items-center gap-2">
            {account.domain}
            {siteStatus.live === true && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
            {siteStatus.live === false && <XCircle className="w-4 h-4 text-destructive" />}
          </h1>
          <p className="text-sm text-muted-foreground">{plan?.name || "Website"} · {account.status}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkSite} disabled={siteStatus.checking}>
            <Activity className="w-4 h-4 mr-1" /> {siteStatus.checking ? "Checking..." : "Check Status"}
          </Button>
          <a href={`https://${account.domain}`} target="_blank" rel="noopener noreferrer">
            <Button variant="accent" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Visit</Button>
          </a>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview"><Globe className="w-4 h-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="domains"><Globe className="w-4 h-4 mr-1.5" /> Domains</TabsTrigger>
          <TabsTrigger value="database"><Database className="w-4 h-4 mr-1.5" /> Database</TabsTrigger>
          <TabsTrigger value="email"><Mail className="w-4 h-4 mr-1.5" /> Email</TabsTrigger>
          <TabsTrigger value="files"><FolderOpen className="w-4 h-4 mr-1.5" /> Files</TabsTrigger>
          <TabsTrigger value="ssl"><Shield className="w-4 h-4 mr-1.5" /> SSL</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Status", value: siteStatus.live === true ? "Live" : siteStatus.live === false ? "Down" : account.status, icon: Activity, color: siteStatus.live === true ? "text-success" : "text-destructive" },
                { label: "SSL", value: account.ssl_enabled ? "Active" : "Not Secured", icon: Lock, color: account.ssl_enabled ? "text-success" : "text-warning" },
                { label: "Storage", value: formatMb(account.storage_used_mb), icon: HardDrive, color: "text-accent" },
                { label: "Response", value: siteStatus.responseTime ? `${siteStatus.responseTime}ms` : "—", icon: Wifi, color: "text-accent" },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                  <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {plan && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                <h3 className="font-semibold text-sm">Resource Usage</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Storage</span><span>{formatMb(account.storage_used_mb)} / {formatMb(plan.storage_mb)}</span></div>
                    <Progress value={Math.min((account.storage_used_mb / plan.storage_mb) * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Bandwidth</span><span>0 / {formatMb(plan.bandwidth_mb)}</span></div>
                    <Progress value={0} className="h-2" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* DOMAINS TAB */}
        <TabsContent value="domains">
          <div className="space-y-4">
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-sm">
              <p className="font-medium">Primary Domain: <span className="font-mono">{account.domain}</span></p>
              <p className="text-muted-foreground mt-1">Nameservers: <code className="font-semibold">ns1.vintechdev.store</code> · <code className="font-semibold">ns2.vintechdev.store</code></p>
            </div>
            {domains.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Domain</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {domains.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.domain_name}</TableCell>
                        <TableCell className="capitalize">{d.domain_type}</TableCell>
                        <TableCell><Badge variant="outline" className={d.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{d.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Link to="/dashboard/domains"><Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Manage Domains</Button></Link>
          </div>
        </TabsContent>

        {/* DATABASE TAB */}
        <TabsContent value="database">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Databases</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchDbs} disabled={loadingDbs}><RefreshCw className={`w-4 h-4 mr-1 ${loadingDbs ? "animate-spin" : ""}`} /> Refresh</Button>
                <Button variant="accent" size="sm" onClick={() => setDbDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Create</Button>
              </div>
            </div>
            {loadingDbs ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : databases.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">No databases yet</div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>User</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {databases.map((db: any) => (
                      <TableRow key={db.dbName}>
                        <TableCell className="font-mono text-sm">{db.dbName}</TableCell>
                        <TableCell className="font-mono text-sm">{db.dbUser}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (confirm(`Delete "${db.dbName}"?`)) { await deleteDatabase(db.dbName); toast.success("Deleted"); fetchDbs(); } }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* EMAIL TAB */}
        <TabsContent value="email">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Email Accounts</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchEmails} disabled={loadingEmails}><RefreshCw className={`w-4 h-4 mr-1 ${loadingEmails ? "animate-spin" : ""}`} /> Refresh</Button>
                <Button variant="accent" size="sm" onClick={() => setEmailDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Create</Button>
              </div>
            </div>
            {loadingEmails ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : emails.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">No email accounts yet</div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {emails.map((e: any, i: number) => {
                      const addr = typeof e === "string" ? e : e.email || e.userName;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-accent" />{addr}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (confirm(`Delete "${addr}"?`)) { await deleteEmail(addr); toast.success("Deleted"); fetchEmails(); } }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* FILES TAB */}
        <TabsContent value="files">
          <div className="bg-card rounded-xl border border-border p-8 text-center space-y-3">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold">File Manager</h3>
            <p className="text-sm text-muted-foreground">Upload, edit, and manage your website files.</p>
            <Link to="/dashboard/files"><Button variant="accent" size="sm"><FolderOpen className="w-4 h-4 mr-1" /> Open File Manager</Button></Link>
          </div>
        </TabsContent>

        {/* SSL TAB */}
        <TabsContent value="ssl">
          <div className="space-y-4">
            <div className={`rounded-xl border p-5 ${account.ssl_enabled ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
              <div className="flex items-center gap-3">
                {account.ssl_enabled ? <CheckCircle2 className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6 text-warning" />}
                <div>
                  <h3 className="font-semibold">{account.ssl_enabled ? "SSL Active" : "SSL Not Active"}</h3>
                  <p className="text-sm text-muted-foreground">{account.ssl_enabled ? "Your site is secured with Let's Encrypt SSL." : "Issue an SSL certificate to secure your website."}</p>
                </div>
              </div>
              <Button variant={account.ssl_enabled ? "outline" : "accent"} size="sm" className="mt-3" onClick={handleIssueSSL} disabled={issuingSSL}>
                {issuingSSL ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                {account.ssl_enabled ? "Renew SSL" : "Issue SSL"}
              </Button>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground space-y-1">
              <p>• Provider: <strong className="text-foreground">Let's Encrypt</strong></p>
              <p>• Auto-renewal: Every 90 days</p>
              <p>• Protocol: TLS 1.2 / 1.3</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Database Dialog */}
      <Dialog open={dbDialogOpen} onOpenChange={setDbDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Database</DialogTitle><DialogDescription>Create a MySQL database for {account.domain}</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Database Name</Label><Input placeholder="my_database" value={newDb.name} onChange={(e) => setNewDb(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Username</Label><Input placeholder="db_user" value={newDb.username} onChange={(e) => setNewDb(p => ({ ...p, username: e.target.value }))} /></div>
            <div><Label>Password</Label><div className="flex gap-2"><Input value={newDb.password} onChange={(e) => setNewDb(p => ({ ...p, password: e.target.value }))} /><Button variant="outline" size="sm" onClick={() => setNewDb(p => ({ ...p, password: generatePassword() }))}>Generate</Button></div></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleCreateDb} disabled={creatingDb}>{creatingDb && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Email Account</DialogTitle><DialogDescription>Create a mailbox for {account.domain}</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Username</Label><div className="flex items-center gap-2"><Input placeholder="info" value={newEmail.username} onChange={(e) => setNewEmail(p => ({ ...p, username: e.target.value }))} /><span className="text-sm text-muted-foreground">@{account.domain}</span></div></div>
            <div><Label>Password</Label><div className="flex gap-2"><Input value={newEmail.password} onChange={(e) => setNewEmail(p => ({ ...p, password: e.target.value }))} /><Button variant="outline" size="sm" onClick={() => setNewEmail(p => ({ ...p, password: generatePassword() }))}>Generate</Button></div></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={handleCreateEmail} disabled={creatingEmail}>{creatingEmail && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsiteDetail;
