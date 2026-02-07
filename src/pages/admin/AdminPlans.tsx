import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

const AdminPlans = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("hosting_plans").select("*").order("price_monthly").then(({ data }) => {
      setPlans(data || []);
      setLoading(false);
    });
  }, []);

  const formatMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Hosting Plans</h1>
        <p className="text-sm text-muted-foreground">Manage available hosting packages</p>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No plans found</TableCell></TableRow>
            ) : plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>KES {Number(p.price_monthly).toLocaleString()}</TableCell>
                <TableCell>{p.price_yearly ? `KES ${Number(p.price_yearly).toLocaleString()}` : "—"}</TableCell>
                <TableCell>{formatMb(p.storage_mb)}</TableCell>
                <TableCell>{formatMb(p.bandwidth_mb)}</TableCell>
                <TableCell>{p.max_domains}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminPlans;
