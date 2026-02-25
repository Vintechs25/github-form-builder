import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const [{ data: logsData }, { data: profs }] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("user_id, first_name, last_name, email"),
      ]);
      setLogs(logsData || []);
      const map: Record<string, string> = {};
      profs?.forEach(p => { map[p.user_id] = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown"; });
      setProfiles(map);
      setLoading(false);
    };
    load();
  }, []);

  const actions = [...new Set(logs.map(l => l.action))];
  const filtered = logs.filter(l => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const actionColor = (a: string) => {
    if (a.includes("delete") || a.includes("suspend") || a.includes("block")) return "destructive" as const;
    if (a.includes("create") || a.includes("activate")) return "default" as const;
    return "secondary" as const;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all administrative actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell></TableRow>
            ) : filtered.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                </TableCell>
                <TableCell className="text-sm">{profiles[log.admin_id] || "Unknown"}</TableCell>
                <TableCell>
                  <Badge variant={actionColor(log.action)} className="text-[10px]">
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="text-muted-foreground">{log.target_type}</span>
                  {log.target_id && <span className="text-[10px] ml-1 font-mono">({log.target_id.slice(0, 8)})</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
