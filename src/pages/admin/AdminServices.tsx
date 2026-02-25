import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Play, Pause, Trash2, ShieldCheck, Package, RefreshCw, StopCircle, ScrollText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

const AdminServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const load = async () => {
    let q = supabase.from("hosting_accounts").select("*, hosting_plans(name, slug, plan_type)").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (typeFilter !== "all") q = q.eq("hosting_type", typeFilter);
    const [{ data }, { data: plansData }] = await Promise.all([
      q,
      supabase.from("hosting_plans").select("*").eq("is_active", true).order("price_monthly"),
    ]);
    setServices(data || []);
    setPlans(plansData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("hosting_accounts").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    logAudit(`service_${status}`, "service", id);
    toast.success(`Service ${status}`);
    load();
  };

  const deleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    const { error } = await supabase.from("hosting_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    logAudit("delete_service", "service", id);
    toast.success("Service deleted");
    load();
  };

  const forceSSL = async (service: any) => {
    toast.info(`Issuing SSL for ${service.domain}...`);
    const { error } = await supabase.functions.invoke("vps-api", { body: { action: "issue-ssl", domain: service.domain } });
    if (error) { toast.error("SSL issue failed"); return; }
    await supabase.from("hosting_accounts").update({ ssl_enabled: true }).eq("id", service.id);
    logAudit("force_ssl", "service", service.id, { domain: service.domain });
    toast.success(`SSL issued for ${service.domain}`);
    load();
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logsDialog, setLogsDialog] = useState<{ open: boolean; domain: string; logs: string }>({ open: false, domain: "", logs: "" });

  const redeployApp = async (service: any) => {
    if (!service.backend_id) { toast.error("No backend ID"); return; }
    setActionLoading(service.id);
    const { error } = await supabase.functions.invoke("coolify-api", { body: { action: "redeploy-app", appId: service.backend_id } });
    if (error) toast.error("Redeploy failed");
    else { logAudit("redeploy_app", "service", service.id, { domain: service.domain }); toast.success(`Redeploying ${service.domain}`); }
    setActionLoading(null);
  };

  const stopContainer = async (service: any) => {
    if (!service.backend_id) { toast.error("No backend ID"); return; }
    setActionLoading(service.id);
    const { error } = await supabase.functions.invoke("coolify-api", { body: { action: "stop-app", appId: service.backend_id } });
    if (error) toast.error("Stop failed");
    else { logAudit("stop_container", "service", service.id, { domain: service.domain }); toast.success(`Stopped ${service.domain}`); }
    setActionLoading(null);
  };

  const viewAppLogs = async (service: any) => {
    if (!service.backend_id) { toast.error("No backend ID"); return; }
    setActionLoading(service.id);
    const { data, error } = await supabase.functions.invoke("coolify-api", { body: { action: "get-logs", appId: service.backend_id } });
    if (error) toast.error("Failed to fetch logs");
    else {
      const logs = Array.isArray(data?.logs) ? data.logs.join("\n") : data?.logs || data?.message || "No logs available";
      setLogsDialog({ open: true, domain: service.domain, logs });
    }
    setActionLoading(null);
  };

  const openChangePlan = (service: any) => {
    setEditingService(service);
    setSelectedPlanId(service.plan_id || "");
    setPlanDialogOpen(true);
  };

  const savePlan = async () => {
    if (!editingService || !selectedPlanId) return;
    const { error } = await supabase.from("hosting_accounts").update({ plan_id: selectedPlanId }).eq("id", editingService.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan updated");
    setPlanDialogOpen(false);
    load();
  };

  const filtered = services.filter(s => !search || s.domain.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === "active") return "default" as const;
    if (s === "suspended") return "destructive" as const;
    return "secondary" as const;
  };

  const typeLabel = (t: string) => {
    if (t === "shared_hosting") return "Website";
    if (t === "app_hosting") return "Application";
    return t.replace("_", " ");
  };

  const activeCount = services.filter(s => s.status === "active").length;
  const suspendedCount = services.filter(s => s.status === "suspended").length;
  const formatMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Services</h1>
        <p className="text-sm text-muted-foreground">{services.length} services · {activeCount} active · {suspendedCount} suspended</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by domain..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="shared_hosting">Websites</SelectItem>
            <SelectItem value="app_hosting">Applications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>SSL</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No services found</TableCell></TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.domain}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{(s.hosting_plans as any)?.name || "No plan"}</Badge>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.hosting_type === "app_hosting" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                  }`}>
                    {typeLabel(s.hosting_type)}
                  </span>
                </TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                <TableCell>{s.storage_used_mb} MB</TableCell>
                <TableCell>{s.ssl_enabled ? "✅" : "❌"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {actionLoading === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openChangePlan(s)}>
                        <Package className="w-4 h-4 mr-2" /> Change Plan
                      </DropdownMenuItem>
                      {s.hosting_type === "shared_hosting" && (
                        <DropdownMenuItem onClick={() => forceSSL(s)}>
                          <ShieldCheck className="w-4 h-4 mr-2" /> Force SSL
                        </DropdownMenuItem>
                      )}
                      {s.hosting_type === "application" && s.backend_id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => redeployApp(s)}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Redeploy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => stopContainer(s)}>
                            <StopCircle className="w-4 h-4 mr-2" /> Stop Container
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => viewAppLogs(s)}>
                            <ScrollText className="w-4 h-4 mr-2" /> View Logs
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      {s.status !== "active" && (
                        <DropdownMenuItem onClick={() => updateStatus(s.id, "active")}>
                          <Play className="w-4 h-4 mr-2" /> Activate
                        </DropdownMenuItem>
                      )}
                      {s.status !== "suspended" && (
                        <DropdownMenuItem onClick={() => updateStatus(s.id, "suspended")}>
                          <Pause className="w-4 h-4 mr-2" /> Suspend
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteService(s.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Plan — {editingService?.domain}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.plan_type}) — KES {Number(p.price_monthly).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlanId && (() => {
              const plan = plans.find(p => p.id === selectedPlanId);
              if (!plan) return null;
              return (
                <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Type:</span> {plan.plan_type}</p>
                  <p><span className="text-muted-foreground">Websites:</span> {plan.max_domains}</p>
                  <p><span className="text-muted-foreground">Apps:</span> {plan.max_apps}</p>
                  <p><span className="text-muted-foreground">Storage:</span> {formatMb(plan.storage_mb)}</p>
                  <p><span className="text-muted-foreground">RAM:</span> {plan.ram_mb > 0 ? `${plan.ram_mb} MB` : "—"}</p>
                  <p><span className="text-muted-foreground">Emails:</span> {plan.max_email_accounts}</p>
                  <p><span className="text-muted-foreground">DBs:</span> {plan.max_databases}</p>
                </div>
              );
            })()}
            <Button onClick={savePlan} disabled={!selectedPlanId} className="w-full">Save Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* App Logs Dialog */}
      <Dialog open={logsDialog.open} onOpenChange={open => setLogsDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Logs — {logsDialog.domain}</DialogTitle></DialogHeader>
          <pre className="bg-secondary rounded-lg p-3 text-xs font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {logsDialog.logs || "No logs available"}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServices;
