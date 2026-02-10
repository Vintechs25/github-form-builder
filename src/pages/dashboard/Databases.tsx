import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Database, Plus, Trash2, Copy, Loader2, RefreshCw, ExternalLink,
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
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const Databases = () => {
  const { user } = useOutletContext<ContextType>();
  const { canCreate } = usePlanLimits(user?.id);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDb, setNewDb] = useState({ name: "", username: "", password: "" });
  const PHPMYADMIN_URL = "https://db.vintechcyber.com";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: accs } = await supabase.from("hosting_accounts").select("id, domain, status").eq("user_id", user.id).eq("status", "active");
      setAccounts(accs || []);
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

  const dbLimitCheck = canCreate(selectedDomain, "database", databases.length);

  const handleCreate = async () => {
    if (!newDb.name || !newDb.username || !newDb.password) {
      toast.error("All fields are required");
      return;
    }
    if (!dbLimitCheck.allowed) {
      toast.error(dbLimitCheck.message);
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
          <div className="flex items-center gap-3">
            {dbLimitCheck.limit > 0 && (
              <span className={`text-xs font-medium ${dbLimitCheck.allowed ? "text-muted-foreground" : "text-destructive"}`}>
                {dbLimitCheck.used}/{dbLimitCheck.limit} databases
              </span>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="accent" size="sm" disabled={!dbLimitCheck.allowed}>
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
          </div>
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
              {databases.length > 0 ? (
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
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {databases.map((db: any) => (
                          <TableRow key={db.id || db.dbName}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">{db.dbName}</span>
                                <button onClick={() => copyToClipboard(db.dbName, "Database name")}
                                  className="text-muted-foreground hover:text-foreground">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{db.dbUser}</span>
                                <button onClick={() => copyToClipboard(db.dbUser, "Username")}
                                  className="text-muted-foreground hover:text-foreground">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === db.dbName}
                                onClick={() => handleDelete(db.dbName)}
                              >
                                {deleting === db.dbName ? (
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
              ) : (
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

          {/* phpMyAdmin login */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">phpMyAdmin</h3>
                <p className="text-sm text-muted-foreground">Enter your database credentials to open phpMyAdmin</p>
              </div>
            </div>
            <form
              action={PHPMYADMIN_URL}
              method="POST"
              target="_blank"
              className="flex items-end gap-3"
            >
              <input type="hidden" name="server" value="1" />
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Username</Label>
                <Input name="pma_username" placeholder="db_user" className="h-9" />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Password</Label>
                <Input name="pma_password" type="password" placeholder="••••••••" className="h-9" />
              </div>
              <Button variant="outline" size="sm" type="submit">
                <ExternalLink className="w-4 h-4 mr-1" /> Open phpMyAdmin
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Databases;
