import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Play, Pause, Trash2, ShieldCheck, Package, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Change plan dialog
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const load = async () => {
    let q = supabase.from("hosting_accounts").select("*, hosting_plans(name, slug)").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const [{ data }, { data: plansData }] = await Promise.all([
      q,
      supabase.from("hosting_plans").select("*").eq("is_active", true).order("price_monthly"),
    ]);
    setServices(data || []);
    setPlans(plansData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("hosting_accounts").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Service ${status}`);
    load();
  };

  const toggleSSL = async (id: string, current: boolean) => {
    const { error } = await supabase.from("hosting_accounts").update({ ssl_enabled: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`SSL ${!current ? "enabled" : "disabled"}`);
    load();
  };

  const deleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    const { error } = await supabase.from("hosting_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Service deleted");
    load();
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
    if (s === "active") return "default";
    if (s === "suspended") return "destructive";
    return "secondary";
  };

  const activeCount = services.filter(s => s.status === "active").length;
  const suspendedCount = services.filter(s => s.status === "suspended").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Services</h1>
        <p className="text-sm text-muted-foreground">{services.length} hosting accounts · {activeCount} active · {suspendedCount} suspended</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by domain..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
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
                  <Badge variant="outline" className="text-xs">
                    {s.hosting_plans?.name || "No plan"}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{s.hosting_type.replace("_", " ")}</TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                <TableCell>{s.storage_used_mb} MB</TableCell>
                <TableCell>{s.ssl_enabled ? "✅" : "❌"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openChangePlan(s)}>
                        <Package className="w-4 h-4 mr-2" /> Change Plan
                      </DropdownMenuItem>
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
                      <DropdownMenuItem onClick={() => toggleSSL(s.id, s.ssl_enabled)}>
                        <ShieldCheck className="w-4 h-4 mr-2" /> {s.ssl_enabled ? "Disable SSL" : "Enable SSL"}
                      </DropdownMenuItem>
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

      {/* Change Plan Dialog */}
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
                      {p.name} — KES {Number(p.price_monthly).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlanId && (() => {
              const plan = plans.find(p => p.id === selectedPlanId);
              if (!plan) return null;
              const formatMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
              return (
                <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Storage:</span> {formatMb(plan.storage_mb)}</p>
                  <p><span className="text-muted-foreground">Bandwidth:</span> {formatMb(plan.bandwidth_mb)}</p>
                  <p><span className="text-muted-foreground">Max Domains:</span> {plan.max_domains}</p>
                  <p><span className="text-muted-foreground">Max Emails:</span> {plan.max_email_accounts}</p>
                  <p><span className="text-muted-foreground">Max DBs:</span> {plan.max_databases}</p>
                  <p><span className="text-muted-foreground">WordPress:</span> {plan.wordpress_enabled ? "Yes" : "No"}</p>
                </div>
              );
            })()}
            <Button onClick={savePlan} disabled={!selectedPlanId} className="w-full">Save Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServices;
