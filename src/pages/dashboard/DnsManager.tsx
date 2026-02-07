import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

interface DnsRecord {
  id: string;
  type: string;
  host: string;
  value: string;
  ttl: number;
}

const DnsManager = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const [domain, setDomain] = useState<any>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New record form
  const [newType, setNewType] = useState("A");
  const [newHost, setNewHost] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newTtl, setNewTtl] = useState("3600");

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data: dom } = await supabase
        .from("domains")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!dom) {
        toast.error("Domain not found");
        navigate("/dashboard/domains");
        return;
      }
      setDomain(dom);

      // Load local DNS records
      const { data: dnsData } = await supabase
        .from("dns_records")
        .select("*")
        .eq("domain_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      setRecords(dnsData || []);
      setLoading(false);
    };
    load();
  }, [user, id]);

  const handleCreate = async () => {
    if (!user || !id || !newValue.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("dns_records").insert({
        domain_id: id,
        user_id: user.id,
        type: newType,
        host: newHost.trim() || "@",
        value: newValue.trim(),
        ttl: parseInt(newTtl) || 3600,
      });

      if (error) throw error;

      // If domain is on NameSilo, sync the record
      if (domain?.registrar === "namesilo") {
        await supabase.functions.invoke("namesilo-api", {
          body: {
            action: "addDNSRecord",
            domain: domain.domain_name,
            type: newType,
            host: newHost.trim() || "@",
            value: newValue.trim(),
            ttl: parseInt(newTtl) || 3600,
          },
        });
      }

      toast.success("DNS record added!");
      setNewHost("");
      setNewValue("");
      setDialogOpen(false);

      // Refresh
      const { data } = await supabase
        .from("dns_records")
        .select("*")
        .eq("domain_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setRecords(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to add record");
    }
    setCreating(false);
  };

  const handleDelete = async (record: DnsRecord) => {
    if (!user || !id) return;
    setDeleting(record.id);
    try {
      await supabase.from("dns_records").delete().eq("id", record.id).eq("user_id", user.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
    setDeleting(null);
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/domains")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="font-display font-semibold text-lg">DNS Manager</h1>
          <p className="text-sm text-muted-foreground">{domain?.domain_name}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add DNS Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Host</Label>
                <Input placeholder="@ or subdomain" value={newHost} onChange={(e) => setNewHost(e.target.value)} />
              </div>
              <div>
                <Label>Value</Label>
                <Input placeholder="IP address or target" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
              </div>
              <div>
                <Label>TTL</Label>
                <Select value={newTtl} onValueChange={setNewTtl}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="14400">4 hours</SelectItem>
                    <SelectItem value="86400">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="accent" className="w-full" onClick={handleCreate} disabled={creating || !newValue.trim()}>
                {creating ? "Adding..." : "Add Record"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {records.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <h3 className="font-display font-semibold text-lg mb-2">No DNS records</h3>
          <p className="text-muted-foreground mb-4">Add your first DNS record to configure this domain.</p>
          <Button variant="accent" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Record
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="px-2 py-1 rounded bg-accent/10 text-accent text-xs font-mono font-semibold">
                      {r.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.host}</TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">{r.value}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.ttl}s</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(r)}
                      disabled={deleting === r.id}
                    >
                      {deleting === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
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

export default DnsManager;
