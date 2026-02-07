import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PlanForm {
  name: string; slug: string; description: string;
  price_monthly: string; price_yearly: string;
  storage_mb: string; bandwidth_mb: string;
  max_domains: string; max_email_accounts: string; max_databases: string;
  wordpress_enabled: boolean; is_active: boolean;
}

const empty: PlanForm = {
  name: "", slug: "", description: "",
  price_monthly: "0", price_yearly: "",
  storage_mb: "5120", bandwidth_mb: "51200",
  max_domains: "1", max_email_accounts: "5", max_databases: "1",
  wordpress_enabled: false, is_active: true,
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
      price_monthly: String(p.price_monthly), price_yearly: p.price_yearly ? String(p.price_yearly) : "",
      storage_mb: String(p.storage_mb), bandwidth_mb: String(p.bandwidth_mb),
      max_domains: String(p.max_domains), max_email_accounts: String(p.max_email_accounts),
      max_databases: String(p.max_databases),
      wordpress_enabled: p.wordpress_enabled, is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    const payload = {
      name: form.name, slug: form.slug, description: form.description || null,
      price_monthly: Number(form.price_monthly), price_yearly: form.price_yearly ? Number(form.price_yearly) : null,
      storage_mb: Number(form.storage_mb), bandwidth_mb: Number(form.bandwidth_mb),
      max_domains: Number(form.max_domains), max_email_accounts: Number(form.max_email_accounts),
      max_databases: Number(form.max_databases),
      wordpress_enabled: form.wordpress_enabled, is_active: form.is_active,
    };

    if (editId) {
      const { error } = await supabase.from("hosting_plans").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Plan updated");
    } else {
      const { error } = await supabase.from("hosting_plans").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Plan created");
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("hosting_plans").update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "Plan activated" : "Plan deactivated");
    load();
  };

  const formatMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;

  const set = (key: keyof PlanForm, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Hosting Plans</h1>
          <p className="text-sm text-muted-foreground">Manage packages</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Plan</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Yearly</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Bandwidth</TableHead>
              <TableHead>Domains</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No plans. Click "Add Plan" to create one.</TableCell></TableRow>
            ) : plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>KES {Number(p.price_monthly).toLocaleString()}</TableCell>
                <TableCell>{p.price_yearly ? `KES ${Number(p.price_yearly).toLocaleString()}` : "—"}</TableCell>
                <TableCell>{formatMb(p.storage_mb)}</TableCell>
                <TableCell>{formatMb(p.bandwidth_mb)}</TableCell>
                <TableCell>{p.max_domains}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(p.id, p.is_active)}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit dialog */}
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monthly (KES)</Label><Input type="number" value={form.price_monthly} onChange={e => set("price_monthly", e.target.value)} /></div>
              <div><Label>Yearly (KES)</Label><Input type="number" value={form.price_yearly} onChange={e => set("price_yearly", e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Storage (MB)</Label><Input type="number" value={form.storage_mb} onChange={e => set("storage_mb", e.target.value)} /></div>
              <div><Label>Bandwidth (MB)</Label><Input type="number" value={form.bandwidth_mb} onChange={e => set("bandwidth_mb", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max Domains</Label><Input type="number" value={form.max_domains} onChange={e => set("max_domains", e.target.value)} /></div>
              <div><Label>Max Emails</Label><Input type="number" value={form.max_email_accounts} onChange={e => set("max_email_accounts", e.target.value)} /></div>
              <div><Label>Max DBs</Label><Input type="number" value={form.max_databases} onChange={e => set("max_databases", e.target.value)} /></div>
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
