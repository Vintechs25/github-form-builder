import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, CheckCircle, XCircle, Clock, Ban, Trash2 } from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";

const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"];

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Order marked as ${status}`);
    load();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order? This cannot be undone.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Order deleted");
    load();
  };

  const filtered = orders.filter(o => !search || o.domain_name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search));

  const statusVariant = (s: string) => {
    if (s === "completed") return "default";
    if (s === "cancelled") return "destructive";
    if (s === "processing") return "outline";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by domain or ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                <TableCell className="capitalize">{o.type}</TableCell>
                <TableCell className="font-medium">{o.domain_name || "—"}</TableCell>
                <TableCell>KES {Number(o.total_amount).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{o.billing_cycle}</TableCell>
                <TableCell><Badge variant={statusVariant(o.status)}>{o.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {o.status !== "completed" && (
                        <DropdownMenuItem onClick={() => updateStatus(o.id, "completed")}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Mark Completed
                        </DropdownMenuItem>
                      )}
                      {o.status !== "processing" && o.status !== "completed" && (
                        <DropdownMenuItem onClick={() => updateStatus(o.id, "processing")}>
                          <Clock className="w-4 h-4 mr-2" /> Mark Processing
                        </DropdownMenuItem>
                      )}
                      {o.status !== "pending" && (
                        <DropdownMenuItem onClick={() => updateStatus(o.id, "pending")}>
                          <Clock className="w-4 h-4 mr-2" /> Mark Pending
                        </DropdownMenuItem>
                      )}
                      {o.status !== "cancelled" && (
                        <DropdownMenuItem onClick={() => updateStatus(o.id, "cancelled")} className="text-destructive">
                          <Ban className="w-4 h-4 mr-2" /> Cancel Order
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteOrder(o.id)} className="text-destructive">
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
    </div>
  );
};

export default AdminOrders;
