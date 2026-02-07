import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("invoices").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setInvoices(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = invoices.filter(i => !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()));

  const statusVariant = (s: string) => {
    if (s === "paid") return "default";
    if (s === "overdue") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Invoices</h1>
        <p className="text-sm text-muted-foreground">All system invoices</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search invoice number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Gateway</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-sm">{i.invoice_number}</TableCell>
                <TableCell>KES {Number(i.amount).toLocaleString()}</TableCell>
                <TableCell><Badge variant={statusVariant(i.status)}>{i.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(i.due_date), "MMM d, yyyy")}</TableCell>
                <TableCell>{i.paid_at ? format(new Date(i.paid_at), "MMM d, yyyy") : "—"}</TableCell>
                <TableCell className="capitalize">{i.payment_gateway || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminInvoices;
