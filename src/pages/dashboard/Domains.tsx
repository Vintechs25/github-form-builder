import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Plus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ContextType { user: User | null; }

const Domains = () => {
  const { user } = useOutletContext<ContextType>();
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [domainType, setDomainType] = useState("primary");
  const [creating, setCreating] = useState(false);

  const fetchDomains = async () => {
    if (!user) return;
    const { data } = await supabase.from("domains").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setDomains(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDomains(); }, [user]);

  const handleCreate = async () => {
    if (!user || !domainName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("domains").insert({
      user_id: user.id, domain_name: domainName.trim(), domain_type: domainType, status: "pending",
    });
    if (error) { toast.error(error.message.includes("duplicate") ? "Domain already exists" : "Failed to add domain"); }
    else { toast.success("Domain added!"); setDomainName(""); setDialogOpen(false); fetchDomains(); }
    setCreating(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-success/10 text-success";
      case "pending": return "bg-warning/10 text-warning";
      case "expired": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Domains</h1>
          <p className="text-sm text-muted-foreground">Manage your domains and DNS</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> Add Domain</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Domain</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Domain Name</Label><Input placeholder="example.co.ke" value={domainName} onChange={(e) => setDomainName(e.target.value)} /></div>
              <div>
                <Label>Type</Label>
                <Select value={domainType} onValueChange={setDomainType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="addon">Addon</SelectItem>
                    <SelectItem value="subdomain">Subdomain</SelectItem>
                    <SelectItem value="parked">Parked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="accent" className="w-full" onClick={handleCreate} disabled={creating || !domainName.trim()}>
                {creating ? "Adding..." : "Add Domain"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : domains.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No domains</h3>
          <p className="text-muted-foreground mb-4">Add your first domain to get started.</p>
          <Button variant="accent" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Domain</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Domain</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Nameservers</TableHead><TableHead>Expires</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.domain_name}</TableCell>
                  <TableCell className="capitalize">{d.domain_type}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColor(d.status)}>{d.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.nameserver_1 || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.expires_at ? new Date(d.expires_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Domains;
