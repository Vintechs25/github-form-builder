import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";

const AdminServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("hosting_accounts").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setServices(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = services.filter(s => !search || s.domain.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === "active") return "default";
    if (s === "suspended") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Services</h1>
        <p className="text-sm text-muted-foreground">All hosting accounts across users</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by domain..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>SSL</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No services found</TableCell></TableRow>
            ) : filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.domain}</TableCell>
                <TableCell className="capitalize">{s.hosting_type.replace("_", " ")}</TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                <TableCell>{s.storage_used_mb} MB</TableCell>
                <TableCell>{s.ssl_enabled ? "✅" : "❌"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminServices;
