import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail, Plus, Trash2, Key, Loader2, RefreshCw, ExternalLink,
  Copy, Eye, EyeOff, AlertCircle,
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
import { listEmails, createEmail, deleteEmail, changeEmailPassword } from "@/services/hostingService";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const EmailAccounts = () => {
  const { user } = useOutletContext<ContextType>();
  const { canCreate } = usePlanLimits(user?.id);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwEmail, setPwEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState({ username: "", password: "" });

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

  const fetchEmails = async () => {
    if (!selectedDomain) return;
    setLoadingEmails(true);
    try {
      const result = await listEmails(selectedDomain);
      if (result?.status === 404 || result?.error?.includes("404")) {
        toast.error("Mail server is not available. Please enable the mail server on your hosting panel first.");
        setEmails([]);
        return;
      }
      const data = result?.data?.data ? JSON.parse(result.data.data) : result?.data || [];
      setEmails(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("404") || msg.includes("Not Found")) {
        toast.error("Mail service is not available for this website. Please contact support.");
      } else {
        toast.error(msg || "Failed to list emails");
      }
      console.error("Failed to list emails:", err);
      setEmails([]);
    }
    setLoadingEmails(false);
  };

  useEffect(() => {
    if (selectedDomain) fetchEmails();
  }, [selectedDomain]);

  const emailLimitCheck = canCreate(selectedDomain, "email", emails.length);

  const handleCreate = async () => {
    if (!newEmail.username || !newEmail.password) {
      toast.error("Username and password are required");
      return;
    }
    if (!emailLimitCheck.allowed) {
      toast.error(emailLimitCheck.message);
      return;
    }
    setCreating(true);
    try {
      await createEmail(selectedDomain, newEmail.username, newEmail.password);
      toast.success(`Email account ${newEmail.username}@${selectedDomain} created`);
      setCreateOpen(false);
      setNewEmail({ username: "", password: "" });
      fetchEmails();
    } catch (err: any) {
      toast.error(err.message || "Failed to create email");
    }
    setCreating(false);
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Delete email account "${email}"? All emails will be lost.`)) return;
    setDeleting(email);
    try {
      await deleteEmail(email);
      toast.success(`Email account "${email}" deleted`);
      fetchEmails();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete email");
    }
    setDeleting(null);
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error("Password is required");
      return;
    }
    setChangingPw(pwEmail);
    try {
      await changeEmailPassword(pwEmail, newPassword);
      toast.success("Password changed successfully");
      setPwDialogOpen(false);
      setNewPassword("");
      setPwEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    }
    setChangingPw(null);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 16; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
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
          <h1 className="font-display font-semibold text-lg">Email Accounts</h1>
          <p className="text-sm text-muted-foreground">Create and manage email accounts for your domains</p>
        </div>
        {accounts.length > 0 && (
          <div className="flex items-center gap-3">
            {emailLimitCheck.limit > 0 && (
              <span className={`text-xs font-medium ${emailLimitCheck.allowed ? "text-muted-foreground" : "text-destructive"}`}>
                {emailLimitCheck.used}/{emailLimitCheck.limit} emails
              </span>
            )}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="accent" size="sm" disabled={!emailLimitCheck.allowed}>
                  <Plus className="w-4 h-4 mr-1" /> Create Email
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Email Account</DialogTitle>
                <DialogDescription>Create a new mailbox for {selectedDomain}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email Username</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="info"
                      value={newEmail.username}
                      onChange={(e) => setNewEmail((p) => ({ ...p, username: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">@{selectedDomain}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newEmail.password}
                      onChange={(e) => setNewEmail((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Strong password"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setNewEmail((p) => ({ ...p, password: generatePassword() }))}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button variant="accent" onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No Active Hosting</h3>
          <p className="text-muted-foreground">You need an active hosting account to create email accounts.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.domain}>{a.domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchEmails} disabled={loadingEmails}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingEmails ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {loadingEmails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No email accounts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first email account for {selectedDomain}.
              </p>
              <Button variant="accent" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create Email
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.map((email: any, i: number) => {
                      const emailAddr = typeof email === "string" ? email : email.email || email.userName;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-accent" />
                              <span className="font-medium">{emailAddr}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(emailAddr);
                                  toast.success("Email copied");
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPwEmail(emailAddr);
                                  setPwDialogOpen(true);
                                }}
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === emailAddr}
                                onClick={() => handleDelete(emailAddr)}
                              >
                                {deleting === emailAddr ? (
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

          {/* Webmail link */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Webmail</h3>
                  <p className="text-sm text-muted-foreground">Access your email inbox via SnappyMail</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://${selectedDomain}:8090/snappymail`, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Open Webmail
              </Button>
            </div>
          </div>

          {/* Change Password Dialog */}
          <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>Set a new password for {pwEmail}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                    <Button variant="outline" size="sm" type="button" onClick={() => setNewPassword(generatePassword())}>
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPwDialogOpen(false)}>Cancel</Button>
                <Button variant="accent" onClick={handleChangePassword} disabled={!!changingPw}>
                  {changingPw && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Change Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default EmailAccounts;
