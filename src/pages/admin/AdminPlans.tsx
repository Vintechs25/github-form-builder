import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { logAudit } from "@/lib/auditLog";

interface PlanForm {
  name: string; slug: string; description: string; plan_type: string;
  price_monthly: string; price_yearly: string;
  storage_mb: string; bandwidth_mb: string;
  max_domains: string; max_email_accounts: string; max_databases: string;
  max_apps: string; ram_mb: string;
  wordpress_enabled: boolean; is_active: boolean; is_recommended: boolean;
}

const empty: PlanForm = {
  name: "", slug: "", description: "", plan_type: "shared",
  price_monthly: "0", price_yearly: "",
  storage_mb: "5120", bandwidth_mb: "51200",
  max_domains: "1", max_email_accounts: "5", max_databases: "1",
  max_apps: "0", ram_mb: "0",
  wordpress_enabled: false, is_active: true, is_recommended: false,
};

const AdminPlans = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("hosting_plans").select("*").order("price_monthly");
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setDialogOpen(true); };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name, slug: p.slug, description: p.description || "",
      plan_type: p.plan_type || "shared",
      price_monthly: String(p.price_monthly), price_yearly: p.price_yearly ? String(p.price_yearly) : "",
      storage_mb: String(p.storage_mb), bandwidth_mb: String(p.bandwidth_mb),
      max_domains: String(p.max_domains), max_email_accounts: String(p.max_email_accounts),
      max_databases: String(p.max_databases), max_apps: String(p.max_apps || 0),
      ram_mb: String(p.ram_mb || 0),
      wordpress_enabled: p.wordpress_enabled, is_active: p.is_active, is_recommended: p.is_recommended || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name, slug: form.slug, description: form.description || null,
      plan_type: form.plan_type,
      price_monthly: Number(form.price_monthly), price_yearly: form.price_yearly ? Number(form.price_yearly) : null,
      storage_mb: Number(form.storage_mb), bandwidth_mb: Number(form.bandwidth_mb),
      max_domains: Number(form.max_domains), max_email_accounts: Number(form.max_email_accounts),
      max_databases: Number(form.max_databases), max_apps: Number(form.max_apps),
      ram_mb: Number(form.ram_mb),
      wordpress_enabled: form.wordpress_enabled, is_active: form.is_active, is_recommended: form.is_recommended,
    };

    if (editId) {
      const { error } = await supabase.from("hosting_plans").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      logAudit("update_plan", "plan", editId, { name: form.name });
      toast.success("Plan updated");
    } else {
      const { error } = await supabase.from("hosting_plans").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      logAudit("create_plan", "plan", undefined, { name: form.name });
      toast.success("Plan created");
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan? Users on this plan won't be affected.")) return;
    const { error } = await supabase.from("hosting_plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan deleted");
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("hosting_plans").update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "Plan activated" : "Plan deactivated");
    load();
  };

  const formatMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
  const set = (key: keyof PlanForm, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  const typeLabel = (t: string) => {
    if (t === "shared") return { label: "Shared", cls: "bg-accent/10 text-accent" };
    if (t === "app") return { label: "App", cls: "bg-primary/10 text-primary" };
    return { label: "Hybrid", cls: "bg-warning/10 text-warning" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Hosting Plans</h1>
          <p className="text-sm text-muted-foreground">Manage plans, limits, and pricing</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Plan</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Websites</TableHead>
              <TableHead>Apps</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>RAM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No plans. Click "Add Plan" to create one.</TableCell></TableRow>
            ) : plans.map(p => {
              const tl = typeLabel(p.plan_type);
              return (
                <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.name}
                  {p.is_recommended && <Badge variant="default" className="ml-1.5 text-[10px]">⭐ Recommended</Badge>}
                </TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tl.cls}`}>{tl.label}</span></TableCell>
                  <TableCell>KES {Number(p.price_monthly).toLocaleString()}</TableCell>
                  <TableCell>{p.max_domains}</TableCell>
                  <TableCell>{p.max_apps}</TableCell>
                  <TableCell>{formatMb(p.storage_mb)}</TableCell>
                  <TableCell>{p.ram_mb > 0 ? `${p.ram_mb} MB` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(p.id, p.is_active)}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePlan(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Starter" /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="starter" /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Basic hosting plan" /></div>
            <div>
              <Label>Plan Type</Label>
              <Select value={form.plan_type} onValueChange={v => set("plan_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared (Websites only)</SelectItem>
                  <SelectItem value="app">App (Applications only)</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monthly (KES)</Label><Input type="number" value={form.price_monthly} onChange={e => set("price_monthly", e.target.value)} /></div>
              <div><Label>Yearly (KES)</Label><Input type="number" value={form.price_yearly} onChange={e => set("price_yearly", e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Storage (MB)</Label><Input type="number" value={form.storage_mb} onChange={e => set("storage_mb", e.target.value)} /></div>
              <div><Label>Bandwidth (MB)</Label><Input type="number" value={form.bandwidth_mb} onChange={e => set("bandwidth_mb", e.target.value)} /></div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resource Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Websites</Label><Input type="number" value={form.max_domains} onChange={e => set("max_domains", e.target.value)} /></div>
              <div><Label>Max Applications</Label><Input type="number" value={form.max_apps} onChange={e => set("max_apps", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max Emails</Label><Input type="number" value={form.max_email_accounts} onChange={e => set("max_email_accounts", e.target.value)} /></div>
              <div><Label>Max DBs</Label><Input type="number" value={form.max_databases} onChange={e => set("max_databases", e.target.value)} /></div>
              <div><Label>RAM (MB)</Label><Input type="number" value={form.ram_mb} onChange={e => set("ram_mb", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.wordpress_enabled} onCheckedChange={v => set("wordpress_enabled", v)} />
                <Label>WordPress</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_recommended} onCheckedChange={v => set("is_recommended", v)} />
                <Label>Recommended</Label>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editId ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlans;
