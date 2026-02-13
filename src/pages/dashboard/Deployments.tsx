import { useState, useEffect, useCallback } from "react";
import {
  Rocket, Plus, RefreshCw, Trash2, StopCircle, Eye, Terminal,
  GitBranch, Globe, Loader2, CheckCircle2, XCircle, Clock, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as coolify from "@/services/coolifyService";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Project {
  uuid: string;
  name: string;
  description?: string;
}

interface App {
  uuid: string;
  name: string;
  fqdn?: string;
  git_repository?: string;
  git_branch?: string;
  status?: string;
  description?: string;
  // Coolify returns various status fields
  [key: string]: unknown;
}

type View = "list" | "create" | "detail";

// ─── Component ──────────────────────────────────────────────────────────────

const Deployments = () => {
  // State
  const [view, setView] = useState<View>("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [selectedProject, setSelectedProject] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [domain, setDomain] = useState("");
  const [buildPack, setBuildPack] = useState("nixpacks");

  // New project
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Detail view
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<App | null>(null);
  const [stopTarget, setStopTarget] = useState<App | null>(null);

  // ─── Data loading ───────────────────────────────────────────────────────

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

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setActionLoading(true);
    try {
      await coolify.createProject(newProjectName.trim());
      toast.success("Project created");
      setNewProjectName("");
      setShowNewProject(false);
      const p = await coolify.listProjects();
      setProjects(Array.isArray(p) ? p : []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateApp = async () => {
    if (!selectedProject || !repoUrl.trim()) {
      toast.error("Project and repository URL are required");
      return;
    }
    setActionLoading(true);
    try {
      await coolify.createApp({
        projectId: selectedProject,
        name: repoUrl.trim().split("/").pop()?.replace(".git", "") || "app",
        repoUrl: repoUrl.trim(),
        branch: branch || "main",
        domain: domain.trim() || undefined,
        buildPack,
      });
      toast.success("Application created! Deploying…");
      setView("list");
      setRepoUrl("");
      setBranch("main");
      setDomain("");
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeploy = async (appId: string) => {
    setActionLoading(true);
    try {
      await coolify.deployApp(appId);
      toast.success("Deployment started");
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeploy = async (appId: string) => {
    setActionLoading(true);
    try {
      await coolify.redeployApp(appId);
      toast.success("Redeployment started");
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (app: App) => {
    setActionLoading(true);
    try {
      await coolify.stopApp(app.uuid);
      toast.success("Application stopped");
      setStopTarget(null);
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (app: App) => {
    setActionLoading(true);
    try {
      await coolify.deleteApp(app.uuid);
      toast.success("Application deleted");
      setDeleteTarget(null);
      if (selectedApp?.uuid === app.uuid) {
        setSelectedApp(null);
        setView("list");
      }
      await loadData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLogs = async (appId: string) => {
    setShowLogs(true);
    setLogsLoading(true);
    setLogs("");
    try {
      const data = await coolify.getLogs(appId);
      if (typeof data === "string") {
        setLogs(data);
      } else if (Array.isArray(data)) {
        setLogs(data.map((l: any) => (typeof l === "string" ? l : l.output || l.line || JSON.stringify(l))).join("\n"));
      } else if (data?.logs) {
        setLogs(typeof data.logs === "string" ? data.logs : JSON.stringify(data.logs, null, 2));
      } else {
        setLogs(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setLogs(`Error: ${e.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const openDetail = async (app: App) => {
    setSelectedApp(app);
    setView("detail");
    try {
      const fresh = await coolify.getApp(app.uuid);
      setSelectedApp(fresh);
    } catch { /* keep stale */ }
  };

  // ─── Status badge ───────────────────────────────────────────────────────

  const statusBadge = (status?: string) => {
    const s = (status || "unknown").toLowerCase();
    if (s.includes("running"))
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Running</Badge>;
    if (s.includes("building") || s.includes("starting") || s.includes("restarting"))
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="w-3 h-3 mr-1 animate-spin" />Building</Badge>;
    if (s.includes("stopped") || s.includes("exited"))
      return <Badge variant="secondary"><StopCircle className="w-3 h-3 mr-1" />Stopped</Badge>;
    if (s.includes("error") || s.includes("failed"))
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    return <Badge variant="outline">{status || "Unknown"}</Badge>;
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <Button variant="ghost" size="icon" onClick={() => { setView("list"); setSelectedApp(null); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
            <p className="text-muted-foreground text-sm">Deploy from GitHub in seconds</p>
          </div>
        </div>
        {view === "list" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="w-4 h-4 mr-1" /> New App
            </Button>
          </div>
        )}
      </div>

      {/* ─── LIST VIEW ───────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          {apps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-6">Deploy your first app from a GitHub repository</p>
                <Button onClick={() => setView("create")}>
                  <Plus className="w-4 h-4 mr-2" /> Deploy New App
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {apps.map((app) => (
                <Card
                  key={app.uuid}
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => openDetail(app)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Rocket className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{app.name || app.uuid}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {app.git_repository && (
                            <span className="flex items-center gap-1 truncate">
                              <GitBranch className="w-3 h-3" />
                              {String(app.git_repository).replace("https://github.com/", "")}
                            </span>
                          )}
                          {app.fqdn && (
                            <span className="flex items-center gap-1 truncate">
                              <Globe className="w-3 h-3" />
                              {String(app.fqdn).replace(/^https?:\/\//, "")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {statusBadge(app.status as string)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleRedeploy(app.uuid); }}
                        disabled={actionLoading}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── CREATE VIEW ─────────────────────────────────────────────── */}
      {view === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Deploy New Application</CardTitle>
            <CardDescription>Connect a GitHub repository and deploy it instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Project selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project</label>
              <div className="flex gap-2">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.uuid} value={p.uuid}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowNewProject(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Repo URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Repository URL</label>
              <Input
                placeholder="https://github.com/user/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Branch</label>
              <Input
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Domain (optional)</label>
              <Input
                placeholder="https://myapp.example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>

            {/* Build pack */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Build Type</label>
              <Select value={buildPack} onValueChange={setBuildPack}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nixpacks">Auto-detect (Nixpacks)</SelectItem>
                  <SelectItem value="dockerfile">Dockerfile</SelectItem>
                  <SelectItem value="static">Static Site</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
              <Button onClick={handleCreateApp} disabled={actionLoading}>
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Rocket className="w-4 h-4 mr-2" /> Deploy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── DETAIL VIEW ─────────────────────────────────────────────── */}
      {view === "detail" && selectedApp && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedApp.name || selectedApp.uuid}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedApp.git_repository && (
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5" />
                        {String(selectedApp.git_repository).replace("https://github.com/", "")}
                        {selectedApp.git_branch && ` → ${selectedApp.git_branch}`}
                      </span>
                    )}
                  </CardDescription>
                </div>
                {statusBadge(selectedApp.status as string)}
              </div>
            </CardHeader>
            <CardContent>
              {selectedApp.fqdn && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={String(selectedApp.fqdn)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    {String(selectedApp.fqdn)}
                  </a>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleDeploy(selectedApp.uuid)} disabled={actionLoading}>
                  <Rocket className="w-4 h-4 mr-1" /> Deploy
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRedeploy(selectedApp.uuid)} disabled={actionLoading}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Redeploy
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleViewLogs(selectedApp.uuid)}>
                  <Terminal className="w-4 h-4 mr-1" /> Logs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStopTarget(selectedApp)}
                  disabled={actionLoading}
                >
                  <StopCircle className="w-4 h-4 mr-1" /> Stop
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteTarget(selectedApp)}
                  disabled={actionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── NEW PROJECT DIALOG ──────────────────────────────────────── */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Projects group your applications together</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={actionLoading || !newProjectName.trim()}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── LOGS DIALOG ────────────────────────────────────────────── */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" /> Build Logs
            </DialogTitle>
          </DialogHeader>
          <div className="bg-background border border-border text-foreground rounded-lg p-4 font-mono text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {logsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading logs…
              </div>
            ) : (
              logs || "No logs available"
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── STOP CONFIRM ───────────────────────────────────────────── */}
      <AlertDialog open={!!stopTarget} onOpenChange={(open) => !open && setStopTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the application. Users will no longer be able to access it until you redeploy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => stopTarget && handleStop(stopTarget)} disabled={actionLoading}>
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── DELETE CONFIRM ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the application, its configuration, and volumes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Deployments;
