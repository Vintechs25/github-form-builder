import { useState, useEffect } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Globe, Plus, Search } from "lucide-react";

interface ContextType { user: User | null; }

const Domains = () => {
  const { user } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const { accounts: hostingAccounts, canCreate } = usePlanLimits(user?.id);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [domainName, setDomainName] = useState("");
  const [domainType, setDomainType] = useState("primary");
  const [creating, setCreating] = useState(false);

  const fetchDomains = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("domains")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDomains(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDomains(); }, [user]);

  const primaryDomain = hostingAccounts[0]?.domain || "";
  const domainLimitCheck = canCreate("domain" as const, domains.length, primaryDomain);

  const handleCreate = async () => {
    if (!user || !domainName.trim()) return;
    if (!domainLimitCheck.allowed) {
      toast.error(domainLimitCheck.message);
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("domains").insert({
      user_id: user.id,
      domain_name: domainName.trim(),
      domain_type: domainType,
      status: "pending",
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Domain already exists" : "Failed to add domain");
    } else {
      toast.success("Domain added!");
      setDomainName("");
      setDialogOpen(false);
      fetchDomains();
    }
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
        <div className="flex items-center gap-2">
          <Link to="/dashboard/search-domain">
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-1" /> Search Domains
            </Button>
          </Link>
          {domainLimitCheck.limit > 0 && (
            <span className={`text-xs font-medium ${domainLimitCheck.allowed ? "text-muted-foreground" : "text-destructive"}`}>
              {domainLimitCheck.used}/{domainLimitCheck.limit} domains
            </span>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" size="sm" disabled={!domainLimitCheck.allowed}>
                <Plus className="w-4 h-4 mr-1" /> Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Domain</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Domain Name</Label>
                  <Input placeholder="example.co.ke" value={domainName} onChange={(e) => setDomainName(e.target.value)} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={domainType} onValueChange={setDomainType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="addon">Addon</SelectItem>
                      <SelectItem value="subdomain">Subdomain</SelectItem>
                      <SelectItem value="parked">Parked</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
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
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
        <Globe className="w-5 h-5 text-accent mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Point your domains to our nameservers</p>
          <p className="text-muted-foreground mt-1">
            For hosting to work, update your domain's nameservers to:
            <span className="font-mono font-semibold text-foreground ml-1">ns1.vintechdev.store</span> and
            <span className="font-mono font-semibold text-foreground ml-1">ns2.vintechdev.store</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : domains.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No domains</h3>
          <p className="text-muted-foreground mb-4">Add your first domain or search for a new one to register.</p>
          <div className="flex justify-center gap-3">
            <Button variant="accent" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Domain
            </Button>
            <Link to="/dashboard/search-domain">
              <Button variant="outline">
                <Search className="w-4 h-4 mr-1" /> Search Domains
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Registrar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SSL</TableHead>
                <TableHead>Nameservers</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-16">DNS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.domain_name}</TableCell>
                  <TableCell className="capitalize">{d.domain_type}</TableCell>
                  <TableCell className="text-sm capitalize">{d.registrar || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(d.status)}>{d.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={d.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                      {d.status === "active" ? "SSL Active" : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.nameserver_1 || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/dashboard/domains/${d.id}/dns`)}
                    >
                      <Settings className="w-4 h-4" />
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

export default Domains;
