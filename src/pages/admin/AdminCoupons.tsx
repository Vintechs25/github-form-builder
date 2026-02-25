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
import { Plus, Pencil, Trash2, Tag, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logAudit } from "@/lib/auditLog";

interface CouponForm {
  code: string;
  discount_type: string;
  discount_value: string;
  max_uses: string;
  valid_until: string;
  is_active: boolean;
}

const empty: CouponForm = {
  code: "", discount_type: "percent", discount_value: "10", max_uses: "", valid_until: "", is_active: true,
};

const AdminCoupons = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: String(c.discount_value),
      max_uses: c.max_uses ? String(c.max_uses) : "", valid_until: c.valid_until ? c.valid_until.split("T")[0] : "",
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { toast.error("Code and discount are required"); return; }
    setSaving(true);
    const payload: any = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      is_active: form.is_active,
    };
    if (!editId) payload.created_by = user?.id;

    if (editId) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      logAudit("update_coupon", "coupon", editId, { code: form.code });
      toast.success("Coupon updated");
    } else {
      const { error } = await supabase.from("coupons").insert([payload]);
      if (error) { toast.error(error.message); setSaving(false); return; }
      logAudit("create_coupon", "coupon", undefined, { code: form.code });
      toast.success("Coupon created");
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const deleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    logAudit("delete_coupon", "coupon", id, { code });
    toast.success("Coupon deleted");
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    toast.success(!current ? "Coupon activated" : "Coupon deactivated");
    load();
  };

  const set = (key: keyof CouponForm, val: string | boolean) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Coupons & Discounts</h1>
          <p className="text-sm text-muted-foreground">Promotional codes for billing</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Coupon</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : coupons.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No coupons yet</TableCell></TableRow>
            ) : coupons.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-bold text-sm">{c.code}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `KES ${Number(c.discount_value).toLocaleString()}`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.valid_until ? format(new Date(c.valid_until), "MMM d, yyyy") : "No expiry"}
                </TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(c.id, c.is_active)}>
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCoupon(c.id, c.code)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Coupon Code</Label><Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="WELCOME20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => set("discount_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={form.discount_value} onChange={e => set("discount_value", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Uses</Label><Input type="number" value={form.max_uses} onChange={e => set("max_uses", e.target.value)} placeholder="Unlimited" /></div>
              <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => set("valid_until", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editId ? "Update Coupon" : "Create Coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
