import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";

const AdminTickets = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setTickets(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = tickets.filter(t => !search || t.subject.toLowerCase().includes(search.toLowerCase()));

  const statusVariant = (s: string) => {
    if (s === "open") return "destructive";
    if (s === "closed") return "secondary";
    return "default";
  };

  const priorityVariant = (p: string) => {
    if (p === "high" || p === "urgent") return "destructive";
    if (p === "medium") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Support Tickets</h1>
        <p className="text-sm text-muted-foreground">Manage all support requests</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tickets found</TableCell></TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.subject}</TableCell>
                <TableCell className="capitalize">{t.category}</TableCell>
                <TableCell><Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge></TableCell>
                <TableCell><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminTickets;
