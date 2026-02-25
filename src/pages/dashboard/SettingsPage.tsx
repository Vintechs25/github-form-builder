import { useState, useEffect } from "react";
import { Settings, Save, KeyRound, Trash2, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const SettingsPage = () => {
  const { user } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setFirstName(data.first_name || ""); setLastName(data.last_name || ""); }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ first_name: firstName, last_name: lastName }).eq("user_id", user.id);
    if (error) toast.error("Failed to save"); else toast.success("Profile updated!");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Please fill in all password fields"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || "Failed to change password");
    } else {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPw(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") { toast.error("Please type DELETE to confirm"); return; }
    setDeleting(true);
    
    // Delete user data (profile, services, etc.)
    if (user) {
      await supabase.from("hosting_accounts").delete().eq("user_id", user.id);
      await supabase.from("domains").delete().eq("user_id", user.id);
      await supabase.from("orders").delete().eq("user_id", user.id);
      await supabase.from("invoices").delete().eq("user_id", user.id);
      await supabase.from("support_tickets").delete().eq("user_id", user.id);
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("user_id", user.id);
    }
    
    await supabase.auth.signOut();
    toast.success("Account deleted. We're sorry to see you go.");
    navigate("/");
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile Information */}
      <div className="bg-card rounded-xl border border-border p-6 max-w-lg space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-accent" /> Profile Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
        <Button variant="accent" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-xl border border-border p-6 max-w-lg space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-accent" /> Change Password
        </h3>
        <div className="space-y-3">
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
          </div>
        </div>
        <Button variant="accent" onClick={handleChangePassword} disabled={changingPw}>
          {changingPw ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
          {changingPw ? "Changing..." : "Change Password"}
        </Button>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-card rounded-xl border border-border p-6 max-w-lg space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" /> Two-Factor Authentication
        </h3>
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account. When enabled, you'll need to enter a code from your authenticator app when signing in.
        </p>
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div>
            <p className="text-sm font-medium">Authenticator App</p>
            <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or similar</p>
          </div>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Coming Soon</Badge>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-6 max-w-lg space-y-4">
        <h3 className="font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete Account
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all services, domains, invoices, and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
            <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting || deleteConfirm !== "DELETE"}>
              {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              {deleting ? "Deleting..." : "Delete My Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
