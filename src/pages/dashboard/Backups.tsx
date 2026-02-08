import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Archive, Download, Trash2, RefreshCw, Plus, Loader2,
  Clock, CheckCircle2, HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createBackup, listBackups, restoreBackup, deleteBackup } from "@/services/hostingService";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const Backups = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("hosting_accounts")
      .select("id, domain, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => {
        setAccounts(data || []);
        if (data && data.length > 0) setSelectedDomain(data[0].domain);
        setLoading(false);
      });
  }, [user]);

  const fetchBackups = async () => {
    if (!selectedDomain) return;
    setLoadingBackups(true);
    try {
      const result = await listBackups(selectedDomain);
      const data = result?.data?.data ? JSON.parse(result.data.data) : result?.data || [];
      setBackups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to list backups:", err);
      setBackups([]);
    }
    setLoadingBackups(false);
  };

  useEffect(() => {
    if (selectedDomain) fetchBackups();
  }, [selectedDomain]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createBackup(selectedDomain);
      toast.success("Backup creation started. It may take a few minutes to complete.");
      setTimeout(fetchBackups, 5000);
    } catch (err: any) {
      toast.error(err.message || "Failed to create backup");
    }
    setCreating(false);
  };

  const handleRestore = async (backupFile: string) => {
    setRestoring(backupFile);
    setConfirmRestore(null);
    try {
      await restoreBackup(backupFile);
      toast.success("Backup restoration started. Your site will be updated shortly.");
    } catch (err: any) {
      toast.error(err.message || "Failed to restore backup");
    }
    setRestoring(null);
  };

  const handleDelete = async (backupFile: string) => {
    if (!confirm(`Delete backup "${backupFile}"? This cannot be undone.`)) return;
    setDeleting(backupFile);
    try {
      await deleteBackup(backupFile);
      toast.success("Backup deleted");
      fetchBackups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete backup");
    }
    setDeleting(null);
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
          <h1 className="font-display font-semibold text-lg">Backups</h1>
          <p className="text-sm text-muted-foreground">Create and manage backups of your websites</p>
        </div>
        {accounts.length > 0 && (
          <Button variant="accent" size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Create Backup
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No Active Hosting</h3>
          <p className="text-muted-foreground">You need an active hosting account to create backups.</p>
        </div>
      ) : (
        <>
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
            <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loadingBackups}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingBackups ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {loadingBackups ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No backups found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first backup to protect your website data.
              </p>
              <Button variant="accent" size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Create Backup
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Backup File</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup: any, i: number) => {
                      const fileName = typeof backup === "string" ? backup : backup.fileName || backup.name;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <HardDrive className="w-4 h-4 text-accent" />
                              <span className="font-mono text-sm">{fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {backup.date || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmRestore(fileName)}
                                disabled={restoring === fileName}
                              >
                                {restoring === fileName ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4 mr-1" />
                                )}
                                Restore
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === fileName}
                                onClick={() => handleDelete(fileName)}
                              >
                                {deleting === fileName ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {/* Info */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Archive className="w-4 h-4 text-accent" /> About Backups
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Backups include all website files, databases, and email data</li>
              <li>• Backup creation may take several minutes depending on site size</li>
              <li>• Restoring a backup will overwrite current website data</li>
              <li>• We recommend creating a backup before making major changes</li>
            </ul>
          </div>
        </>
      )}

      {/* Confirm Restore Dialog */}
      <Dialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              This will restore your website from the backup. Your current files and databases will be replaced.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Yes, Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Backups;
