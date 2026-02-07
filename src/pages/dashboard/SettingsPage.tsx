import { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const SettingsPage = () => {
  const { user } = useOutletContext<ContextType>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 max-w-lg space-y-4">
        <h3 className="font-semibold">Profile Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <div><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
        <Button variant="accent" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
