import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Trash2, RefreshCw, Globe, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAudit } from "@/lib/auditLog";

const AdminDomains = () => {
  const [domains, setDomains] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase.from("domains").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setDomains(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const deleteDomain = async (id: string, name: string) => {
    if (!confirm(`Delete ${name} and all DNS records? This cannot be undone.`)) return;
    await supabase.from("dns_records").delete().eq("domain_id", id);
    const { error } = await supabase.from("domains").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    logAudit("delete_domain", "domain", id, { domain_name: name });
    toast.success("Domain deleted");
    load();
  };

  const [refreshing, setRefreshing] = useState<string | null>(null);
  const forceDnsRefresh = async (domain: any) => {
    setRefreshing(domain.id);
    const { error } = await supabase.functions.invoke("vps-api", {
      body: { action: "list-dns-records", domain: domain.domain_name, recordType: "aRecord" },
    });
    if (error) toast.error("DNS refresh failed");
    else { logAudit("force_dns_refresh", "domain", domain.id, { domain_name: domain.domain_name }); toast.success(`DNS refreshed for ${domain.domain_name}`); }
    setRefreshing(null);
  };

  const deleteDnsZone = async (domain: any) => {
    if (!confirm(`Delete DNS zone for ${domain.domain_name}? This removes all server-side DNS records.`)) return;
    const { error } = await supabase.functions.invoke("vps-api", {
      body: { action: "delete-dns-zone", domain: domain.domain_name },
    });
    if (error) toast.error("Failed to delete DNS zone");
    else { logAudit("delete_dns_zone", "domain", domain.id, { domain_name: domain.domain_name }); toast.success(`DNS zone deleted for ${domain.domain_name}`); }
  };

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
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No domains found</TableCell></TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.domain_name}</TableCell>
                <TableCell className="capitalize">{d.domain_type}</TableCell>
                <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                <TableCell>{d.registrar || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{d.expires_at ? format(new Date(d.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {refreshing === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => forceDnsRefresh(d)}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Force DNS Refresh
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteDnsZone(d)}>
                        <Globe className="w-4 h-4 mr-2" /> Delete DNS Zone
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteDomain(d.id, d.domain_name)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Domain
                      </DropdownMenuItem>
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

export default AdminDomains;
