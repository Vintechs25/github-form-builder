import { useState, useEffect } from "react";
import { CreditCard, Download, Loader2, ArrowUpCircle } from "lucide-react";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface ContextType {
  user: User | null;
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

const Billing = () => {
  const { user, profile } = useOutletContext<ContextType>();
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
    setPaying(invoice.id);
    try {
      const callbackUrl = `${window.location.origin}/dashboard/payment-callback`;
      const { data, error } = await supabase.functions.invoke("paystack/initialize", {
        body: { invoice_id: invoice.id, callback_url: callbackUrl },
      });
      if (error) throw new Error(error.message);
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("Failed to get payment URL");
      }
    } catch (err: any) {
      toast.error(err.message || "Payment initialization failed");
      setPaying(null);
    }
  };

  const downloadInvoice = (inv: any) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 25;

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", margin, y);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Vintechs Cloud Hosting", pageWidth - margin, y, { align: "right" });
      y += 6;
      doc.text("support@vintechcyber.com", pageWidth - margin, y, { align: "right" });

      // Invoice details
      y += 20;
      doc.setTextColor(0);
      doc.setFontSize(10);

      const details = [
        ["Invoice Number:", inv.invoice_number],
        ["Date Issued:", new Date(inv.created_at).toLocaleDateString()],
        ["Due Date:", new Date(inv.due_date).toLocaleDateString()],
        ["Status:", inv.status.toUpperCase()],
      ];

      if (inv.paid_at) {
        details.push(["Paid On:", new Date(inv.paid_at).toLocaleDateString()]);
      }

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 45, y);
        y += 6;
      });

      // Bill To
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const clientName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : user?.email || "Customer";
      doc.text(clientName, margin, y);
      y += 5;
      doc.text(profile?.email || user?.email || "", margin, y);

      // Separator
      y += 12;
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);

      // Table header
      y += 10;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Description", margin + 3, y);
      doc.text("Amount", pageWidth - margin - 3, y, { align: "right" });

      // Table row
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(inv.description || "Hosting Service", margin + 3, y);
      doc.text(`KES ${Number(inv.amount).toLocaleString()}`, pageWidth - margin - 3, y, { align: "right" });

      // Total
      y += 12;
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total:", pageWidth - margin - 60, y);
      doc.text(`KES ${Number(inv.amount).toLocaleString()}`, pageWidth - margin - 3, y, { align: "right" });

      // Payment status badge
      y += 16;
      if (inv.status === "paid") {
        doc.setFontSize(14);
        doc.setTextColor(34, 139, 34);
        doc.setFont("helvetica", "bold");
        doc.text("✓ PAID", pageWidth / 2, y, { align: "center" });
      } else {
        doc.setFontSize(14);
        doc.setTextColor(200, 100, 0);
        doc.setFont("helvetica", "bold");
        doc.text("UNPAID", pageWidth / 2, y, { align: "center" });
      }

      // Footer
      doc.setTextColor(150);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your business.", pageWidth / 2, 275, { align: "center" });
      doc.text("Vintechs Cloud Hosting — vintechcyber.com", pageWidth / 2, 280, { align: "center" });

      doc.save(`invoice-${inv.invoice_number}.pdf`);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to generate invoice");
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Billing</h1>
          <p className="text-sm text-muted-foreground">View invoices, payment history, and manage your subscription</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="outline" size="sm">
            <ArrowUpCircle className="w-4 h-4 mr-1" /> Upgrade Plan
          </Button>
        </Link>
      </div>

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
                  <TableCell className="font-semibold">KES {Number(inv.amount).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(inv.status === "unpaid" || inv.status === "overdue") && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handlePay(inv)}
                          disabled={paying === inv.id}
                        >
                          {paying === inv.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Redirecting...</> : "Pay Now"}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => downloadInvoice(inv)} title="Download Invoice">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
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
