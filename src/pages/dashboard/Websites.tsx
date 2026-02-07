import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Plus, MoreVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContextType { user: User | null; }

const Websites = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [hostingType, setHostingType] = useState("file_upload");
  const [creating, setCreating] = useState(false);

  const fetchAccounts = async () => {
    if (!user) return;
    const { data } = await supabase.from("hosting_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [user]);

  const handleCreate = async () => {
    if (!user || !domain.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("hosting_accounts").insert({
      user_id: user.id,
      domain: domain.trim(),
      hosting_type: hostingType,
      status: "pending",
    });
    if (error) { toast.error("Failed to create website"); }
    else { toast.success("Website created! Provisioning will begin shortly."); setDomain(""); setDialogOpen(false); fetchAccounts(); }
    setCreating(false);
  };

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Websites</h1>
          <p className="text-sm text-muted-foreground">Manage your hosting accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> New Website</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Website</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Domain Name</Label><Input placeholder="example.co.ke" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
              <div>
                <Label>Hosting Type</Label>
                <Select value={hostingType} onValueChange={setHostingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file_upload">File Upload Hosting</SelectItem>
                    <SelectItem value="wordpress">WordPress Hosting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="accent" className="w-full" onClick={handleCreate} disabled={creating || !domain.trim()}>
                {creating ? "Creating..." : "Create Website"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
        <Globe className="w-5 h-5 text-accent mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Point your domains to our nameservers</p>
          <p className="text-muted-foreground mt-1">
            For hosting to be active, set your domain's nameservers to:
            <span className="font-mono font-semibold text-foreground ml-1">ns1.vintechdev.store</span> and
            <span className="font-mono font-semibold text-foreground ml-1">ns2.vintechdev.store</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No websites yet</h3>
          <p className="text-muted-foreground mb-4">Create your first website to get started with hosting.</p>
          <Button variant="accent" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Create Website</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {accounts.map((account, i) => (
            <motion.div key={account.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{account.domain}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{account.hosting_type.replace("_", " ")}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  account.status === "active" ? "bg-success/10 text-success" :
                  account.status === "pending" ? "bg-warning/10 text-warning" :
                  "bg-destructive/10 text-destructive"
                }`}>{account.status}</span>
              </div>
              <div className="space-y-2 mb-4">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Storage</span><span>{formatMb(account.storage_used_mb)} / 5 GB</span></div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((account.storage_used_mb / 5120) * 100, 100)}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Bandwidth</span><span>{formatMb(account.bandwidth_used_mb)} / 50 GB</span></div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full" style={{ width: `${Math.min((account.bandwidth_used_mb / 51200) * 100, 100)}%` }} /></div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1">File Manager</Button>
                {account.hosting_type === "wordpress" && (
                  <Button variant="accent" size="sm" className="flex-1">
                    <ExternalLink className="w-3 h-3 mr-1" /> WordPress
                  </Button>
                )}
                {account.ssl_enabled && <span className="text-xs text-success font-medium">🔒 SSL</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Websites;
