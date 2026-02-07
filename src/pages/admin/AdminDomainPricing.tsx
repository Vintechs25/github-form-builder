import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RefreshCw, Search, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TldPricing {
  id: string;
  tld: string;
  register_price: number;
  renew_price: number;
  transfer_price: number;
  currency: string;
  markup_percent: number;
  sell_price_register: number;
  sell_price_renew: number;
  sell_price_transfer: number;
  is_enabled: boolean;
  last_synced_at: string | null;
}

const AdminDomainPricing = () => {
  const [pricing, setPricing] = useState<TldPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [editingMarkup, setEditingMarkup] = useState<Record<string, string>>({});

  const fetchPricing = async () => {
    const { data } = await supabase
      .from("domain_pricing")
      .select("*")
      .order("tld");
    setPricing((data as TldPricing[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPricing(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("namesilo-api", {
        body: { action: "syncPrices" },
      });
      if (error) throw new Error(error.message);
      toast.success(`Synced ${data?.data?.synced || 0} TLD prices from NameSilo`);
      fetchPricing();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    }
    setSyncing(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from("domain_pricing").update({ is_enabled: enabled }).eq("id", id);
    setPricing((prev) => prev.map((p) => (p.id === id ? { ...p, is_enabled: enabled } : p)));
  };

  const handleMarkupSave = async (id: string) => {
    const val = parseFloat(editingMarkup[id]);
    if (isNaN(val) || val < 0) { toast.error("Invalid markup"); return; }
    const { error } = await supabase.from("domain_pricing").update({ markup_percent: val }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Markup updated");
    setEditingMarkup((prev) => { const n = { ...prev }; delete n[id]; return n; });
    fetchPricing();
  };

  const filtered = pricing.filter((p) => !search || p.tld.toLowerCase().includes(search.toLowerCase()));
  const enabledCount = pricing.filter((p) => p.is_enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Domain Pricing</h1>
          <p className="text-sm text-muted-foreground">
            {pricing.length} TLDs loaded · {enabledCount} enabled
          </p>
        </div>
        <Button variant="accent" onClick={handleSync} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Sync from NameSilo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search TLDs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TLD</TableHead>
              <TableHead>Cost (Register)</TableHead>
              <TableHead>Cost (Renew)</TableHead>
              <TableHead>Cost (Transfer)</TableHead>
              <TableHead>Markup %</TableHead>
              <TableHead>Sell (Register)</TableHead>
              <TableHead>Sell (Renew)</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Last Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {pricing.length === 0 ? 'No pricing data. Click "Sync from NameSilo" to import.' : "No matching TLDs"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.tld}</TableCell>
                  <TableCell>${p.register_price.toFixed(2)}</TableCell>
                  <TableCell>${p.renew_price.toFixed(2)}</TableCell>
                  <TableCell>${p.transfer_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        className="w-20 h-8 text-sm"
                        type="number"
                        min="0"
                        value={editingMarkup[p.id] ?? p.markup_percent}
                        onChange={(e) => setEditingMarkup((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onBlur={() => {
                          if (editingMarkup[p.id] !== undefined) handleMarkupSave(p.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingMarkup[p.id] !== undefined) handleMarkupSave(p.id);
                        }}
                      />
                      <span className="text-muted-foreground text-xs">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-accent">${p.sell_price_register.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold text-accent">${p.sell_price_renew.toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch checked={p.is_enabled} onCheckedChange={(v) => handleToggle(p.id, v)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.last_synced_at ? format(new Date(p.last_synced_at), "MMM d, HH:mm") : "Never"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminDomainPricing;
