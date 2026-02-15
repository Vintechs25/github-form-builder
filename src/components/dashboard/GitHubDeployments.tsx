import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Loader2, Search, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as coolify from "@/services/coolifyService";
import { AppCard } from "@/components/deploy/AppCard";
import { AppDetail } from "@/components/deploy/AppDetail";
import { CreateAppForm } from "@/components/deploy/CreateAppForm";
import type { App, Project } from "@/components/deploy/types";

type View = "list" | "create" | "detail";

const GitHubDeployments = () => {
  const [view, setView] = useState<View>("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, appsRes] = await Promise.all([
        coolify.listProjects(),
        coolify.listApps(),
      ]);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
      setApps(Array.isArray(appsRes) ? appsRes : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openDetail = async (app: App) => {
    setSelectedApp(app);
    setView("detail");
    try {
      const fresh = await coolify.getApp(app.uuid);
      setSelectedApp(fresh);
    } catch { /* keep stale */ }
  };

  const filteredApps = apps.filter((app) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (app.name || "").toLowerCase().includes(q) ||
      (app.git_repository || "").toLowerCase().includes(q) ||
      (app.fqdn || "").toLowerCase().includes(q)
    );
  });

  // ─── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Detail view ───────────────────────────────────────────────────
  if (view === "detail" && selectedApp) {
    return (
      <AppDetail
        app={selectedApp}
        onBack={() => { setView("list"); setSelectedApp(null); }}
        onRefresh={loadData}
      />
    );
  }

  // ─── Create view ───────────────────────────────────────────────────
  if (view === "create") {
    return (
      <CreateAppForm
        projects={projects}
        onCreated={() => { setView("list"); loadData(); }}
        onCancel={() => setView("list")}
        onProjectsChanged={setProjects}
      />
    );
  }

  // ─── List view ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Search & actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search deployments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="accent" onClick={() => setView("create")}>
            <Plus className="w-4 h-4 mr-1" /> Add New...
          </Button>
        </div>
      </div>

      {/* Apps grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Rocket className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {search ? "No matching deployments" : "No applications yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {search
              ? "Try a different search term"
              : "Import a Git repository to deploy your first app"}
          </p>
          {!search && (
            <Button variant="accent" onClick={() => setView("create")}>
              <Plus className="w-4 h-4 mr-2" /> Import Git Repository
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <AppCard key={app.uuid} app={app} onClick={() => openDetail(app)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GitHubDeployments;
