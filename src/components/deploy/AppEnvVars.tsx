import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as coolify from "@/services/coolifyService";
import type { EnvVar } from "./types";

interface AppEnvVarsProps {
  appId: string;
}

export function AppEnvVars({ appId }: AppEnvVarsProps) {
  const [envs, setEnvs] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValues, setShowValues] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEnvs = async () => {
    setLoading(true);
    try {
      const data = await coolify.listEnvs(appId);
      setEnvs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load environment variables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEnvs(); }, [appId]);

  const handleAdd = async () => {
    if (!newKey.trim()) { toast.error("Key is required"); return; }
    setSaving(true);
    try {
      await coolify.createEnv(appId, newKey.trim(), newValue);
      toast.success("Variable added");
      setNewKey("");
      setNewValue("");
      await loadEnvs();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (envUuid: string) => {
    setDeletingId(envUuid);
    try {
      await coolify.deleteEnv(appId, envUuid);
      toast.success("Variable removed");
      setEnvs((prev) => prev.filter((e) => e.uuid !== envUuid));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Environment Variables</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowValues(!showValues)}>
          {showValues ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
          {showValues ? "Hide" : "Reveal"}
        </Button>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="KEY"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
          className="font-mono text-xs flex-1"
        />
        <Input
          placeholder="value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          type={showValues ? "text" : "password"}
          className="font-mono text-xs flex-[2]"
        />
        <Button size="sm" variant="accent" onClick={handleAdd} disabled={saving || !newKey.trim()}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        </Button>
      </div>

      {/* Existing vars */}
      {envs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No environment variables configured</p>
      ) : (
        <div className="space-y-1.5">
          {envs.map((env) => (
            <div key={env.uuid} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border group">
              <code className="text-xs font-mono font-semibold text-foreground min-w-[120px]">{env.key}</code>
              <span className="text-xs text-muted-foreground mx-1">=</span>
              <code className="text-xs font-mono text-muted-foreground flex-1 truncate">
                {showValues ? env.value : "•".repeat(Math.min(20, (env.value || "").length || 8))}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => handleDelete(env.uuid)}
                disabled={deletingId === env.uuid}
              >
                {deletingId === env.uuid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Changes require a redeploy to take effect.
      </p>
    </div>
  );
}
