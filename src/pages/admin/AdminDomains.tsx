import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";

const AdminDomains = () => {
  const [domains, setDomains] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("domains").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setDomains(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = domains.filter(d => !search || d.domain_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Domains</h1>
        <p className="text-sm text-muted-foreground">All registered domains</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registrar</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No domains found</TableCell></TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.domain_name}</TableCell>
                <TableCell className="capitalize">{d.domain_type}</TableCell>
                <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                <TableCell>{d.registrar || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{d.expires_at ? format(new Date(d.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminDomains;
