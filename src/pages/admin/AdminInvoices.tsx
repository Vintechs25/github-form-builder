import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, CheckCircle, DollarSign, AlertTriangle, Ban } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from("invoices").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("invoices").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_gateway: "manual",
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice marked as paid");
    load();
  };

  const markOverdue = async (id: string) => {
    const { error } = await supabase.from("invoices").update({ status: "overdue" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice marked as overdue");
    load();
  };

  const cancelInvoice = async (id: string) => {
    const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice cancelled");
    load();
  };

  const filtered = invoices.filter(i =>
    !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase())
  );

  const statusVariant = (s: string) => {
    if (s === "paid") return "default";
    if (s === "overdue") return "destructive";
    if (s === "cancelled") return "outline";
    return "secondary";
  };

  const totalUnpaid = invoices.filter(i => i.status === "unpaid" || i.status === "overdue").reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Invoices</h1>
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <p className="text-lg font-display font-bold text-accent">KES {totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-lg font-display font-bold text-destructive">KES {totalUnpaid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Paid Count</p>
          <p className="text-lg font-display font-bold">{invoices.filter(i => i.status === "paid").length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-lg font-display font-bold text-destructive">{invoices.filter(i => i.status === "overdue").length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-sm">{i.invoice_number}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{i.description || "—"}</TableCell>
                <TableCell className="font-medium">KES {Number(i.amount).toLocaleString()}</TableCell>
                <TableCell><Badge variant={statusVariant(i.status)}>{i.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(i.due_date), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-muted-foreground">{i.paid_at ? format(new Date(i.paid_at), "MMM d") : "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {i.status !== "paid" && (
                        <DropdownMenuItem onClick={() => markPaid(i.id)}>
                          <CheckCircle className="w-4 h-4 mr-2 text-accent" /> Mark Paid
                        </DropdownMenuItem>
                      )}
                      {i.status === "unpaid" && (
                        <DropdownMenuItem onClick={() => markOverdue(i.id)}>
                          <AlertTriangle className="w-4 h-4 mr-2 text-warning" /> Mark Overdue
                        </DropdownMenuItem>
                      )}
                      {i.status !== "cancelled" && i.status !== "paid" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => cancelInvoice(i.id)} className="text-destructive">
                            <Ban className="w-4 h-4 mr-2" /> Cancel
                          </DropdownMenuItem>
                        </>
                      )}
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

export default AdminInvoices;
