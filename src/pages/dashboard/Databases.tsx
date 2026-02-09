import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Database, Plus, Trash2, Copy, Eye, EyeOff, Loader2, RefreshCw,
  ExternalLink, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { listDatabases, createDatabase, deleteDatabase } from "@/services/hostingService";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const Databases = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDb, setNewDb] = useState({ name: "", username: "", password: "" });
  const [localDbs, setLocalDbs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: accs } = await supabase.from("hosting_accounts").select("id, domain, status").eq("user_id", user.id).eq("status", "active");
      setAccounts(accs || []);
      setLocalDbs([]);
      if (accs && accs.length > 0) setSelectedDomain(accs[0].domain);
      setLoading(false);
    };
    load();
  }, [user]);

  const fetchDatabases = async () => {
    if (!selectedDomain) return;
    setLoadingDbs(true);
    try {
      const result = await listDatabases(selectedDomain);
      setDatabases(result?.data?.data ? JSON.parse(result.data.data) : []);
    } catch (err: any) {
      console.error("Failed to list databases:", err);
      // Fall back to local data
      setDatabases([]);
    }
    setLoadingDbs(false);
  };

  useEffect(() => {
    if (selectedDomain) fetchDatabases();
  }, [selectedDomain]);

  const handleCreate = async () => {
    if (!newDb.name || !newDb.username || !newDb.password) {
      toast.error("All fields are required");
      return;
    }
    setCreating(true);
    try {
      const result = await createDatabase(selectedDomain, newDb.name, newDb.username, newDb.password);
      if (result?.status === 0 || result?.createDBStatus === 0) {
        toast.error(result.error_message || "Failed to create database");
        setCreating(false);
        return;
      }
      toast.success(`Database "${newDb.name}" created successfully`);
      setDialogOpen(false);
      setNewDb({ name: "", username: "", password: "" });
      fetchDatabases();
    } catch (err: any) {
      toast.error(err.message || "Failed to create database");
    }
    setCreating(false);
  };

  const handleDelete = async (dbName: string) => {
    if (!confirm(`Delete database "${dbName}"? This action cannot be undone.`)) return;
    setDeleting(dbName);
    try {
      await deleteDatabase(dbName);
      toast.success(`Database "${dbName}" deleted`);
      fetchDatabases();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete database");
    }
    setDeleting(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    setNewDb((prev) => ({ ...prev, password: pass }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Database Manager</h1>
          <p className="text-sm text-muted-foreground">Create and manage MySQL databases for your websites</p>
        </div>
        {accounts.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Create Database
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Database</DialogTitle>
                <DialogDescription>Create a MySQL database for {selectedDomain}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Database Name</Label>
                  <Input
                    placeholder="my_database"
                    value={newDb.name}
                    onChange={(e) => setNewDb((p) => ({ ...p, name: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Will be prefixed with your username</p>
                </div>
                <div className="space-y-2">
                  <Label>Database Username</Label>
                  <Input
                    placeholder="db_user"
                    value={newDb.username}
                    onChange={(e) => setNewDb((p) => ({ ...p, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Database Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newDb.password}
                      onChange={(e) => setNewDb((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Strong password"
                    />
                    <Button variant="outline" size="sm" onClick={generatePassword} type="button">
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="accent" onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Create Database
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No Active Hosting</h3>
          <p className="text-muted-foreground">You need an active hosting account to create databases.</p>
        </div>
      ) : (
        <>
          {/* Domain selector */}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.domain}>{a.domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDatabases} disabled={loadingDbs}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingDbs ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Database list */}
          {loadingDbs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Show local DB records */}
              {localDbs.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Database className="w-4 h-4 text-accent" /> Your Databases
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Database Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Host</TableHead>
                          <TableHead>Port</TableHead>
                          <TableHead>Website</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {localDbs.map((db) => (
                          <TableRow key={db.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">{db.db_name}</span>
                                <button onClick={() => copyToClipboard(db.db_name, "Database name")}
                                  className="text-muted-foreground hover:text-foreground">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{db.db_username}</span>
                                <button onClick={() => copyToClipboard(db.db_username, "Username")}
                                  className="text-muted-foreground hover:text-foreground">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{db.db_host}</TableCell>
                            <TableCell>{db.db_port}</TableCell>
                            <TableCell className="text-muted-foreground">{db.hosting_accounts?.domain || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === db.db_name}
                                onClick={() => handleDelete(db.db_name)}
                              >
                                {deleting === db.db_name ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </motion.div>
              )}

              {localDbs.length === 0 && databases.length === 0 && (
                <div className="bg-card rounded-xl border border-border p-12 text-center">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No databases yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first database to store your website data.
                  </p>
                  <Button variant="accent" size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Create Database
                  </Button>
                </div>
              )}
            </>
          )}

          {/* phpMyAdmin link */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">phpMyAdmin</h3>
                  <p className="text-sm text-muted-foreground">Advanced database management interface</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const vpsUrl = import.meta.env.VITE_SUPABASE_URL ? "" : "";
                  window.open(`https://${selectedDomain}:8090/dataBases/phpMyAdmin`, "_blank");
                }}
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Open phpMyAdmin
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Databases;
