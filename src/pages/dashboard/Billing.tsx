import { useState, useEffect } from "react";
import { CreditCard, Download, Loader2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ContextType { user: User | null; }

const Billing = () => {
  const { user } = useOutletContext<ContextType>();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [user]);

  const handlePay = async (invoice: any) => {
    // Simulate payment (placeholder for M-Pesa/Paystack integration)
    setPaying(invoice.id);
    try {
      // Mark invoice as paid
      const { error: invErr } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString(), payment_gateway: "manual" })
        .eq("id", invoice.id);
      if (invErr) throw invErr;

      // Mark related order as paid
      if (invoice.order_id) {
        await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", invoice.order_id);

        // Trigger order processing (provisions hosting/domain)
        const { data, error } = await supabase.functions.invoke("process-order", {
          body: { order_id: invoice.order_id },
        });

        if (error) {
          console.error("Process order error:", error);
          toast.warning("Payment recorded but provisioning encountered an issue. Our team will follow up.");
        } else {
          toast.success("Payment successful! Your service is being provisioned.");
        }
      } else {
        toast.success("Payment recorded successfully.");
      }

      fetchInvoices();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    }
    setPaying(null);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-success/10 text-success";
      case "unpaid": return "bg-warning/10 text-warning";
      case "overdue": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Billing</h1>
        <p className="text-sm text-muted-foreground">View invoices and payment history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Invoices", value: invoices.length },
          { label: "Paid", value: invoices.filter((i) => i.status === "paid").length },
          { label: "Unpaid", value: invoices.filter((i) => i.status === "unpaid" || i.status === "overdue").length },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No invoices</h3>
          <p className="text-muted-foreground">Your invoices will appear here once you purchase a hosting plan.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.description || "—"}</TableCell>
                  <TableCell className="font-semibold">{inv.currency} {Number(inv.amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {inv.status === "unpaid" || inv.status === "overdue" ? (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handlePay(inv)}
                        disabled={paying === inv.id}
                      >
                        {paying === inv.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing...</> : "Pay Now"}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Billing;
