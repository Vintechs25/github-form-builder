import { useState, useEffect } from "react";
import { ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ContextType { user: User | null; }

const statusConfig: Record<string, { icon: typeof CheckCircle; className: string }> = {
  completed: { icon: CheckCircle, className: "bg-success/10 text-success" },
  paid: { icon: CheckCircle, className: "bg-success/10 text-success" },
  pending: { icon: Clock, className: "bg-warning/10 text-warning" },
  cancelled: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const Orders = () => {
  const { user } = useOutletContext<ContextType>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setLoading(false);
      });
  }, [user]);

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || { icon: AlertCircle, className: "bg-muted text-muted-foreground" };
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={cfg.className}>
        <Icon className="w-3 h-3 mr-1" /> {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Orders</h1>
        <p className="text-sm text-muted-foreground">Track your hosting and domain orders</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length },
          { label: "Pending", value: orders.filter((o) => o.status === "pending").length },
          { label: "Completed", value: orders.filter((o) => o.status === "completed" || o.status === "paid").length },
          { label: "Cancelled", value: orders.filter((o) => o.status === "cancelled").length },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No orders yet</h3>
          <p className="text-muted-foreground">Your orders will appear here once you purchase hosting or domains.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">{o.id.substring(0, 8)}...</TableCell>
                  <TableCell className="capitalize">{o.type}</TableCell>
                  <TableCell>{o.domain_name || "—"}</TableCell>
                  <TableCell className="font-semibold">KES {Number(o.total_amount).toLocaleString()}</TableCell>
                  <TableCell className="capitalize text-sm">{o.billing_cycle}</TableCell>
                  <TableCell>{getStatusBadge(o.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
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

export default Orders;
