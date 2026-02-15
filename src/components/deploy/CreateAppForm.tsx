import { useState } from "react";
import { Rocket, Plus, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as coolify from "@/services/coolifyService";
import type { Project } from "./types";

interface CreateAppFormProps {
  projects: Project[];
  onCreated: () => void;
  onCancel: () => void;
  onProjectsChanged: (projects: Project[]) => void;
}

export function CreateAppForm({ projects, onCreated, onCancel, onProjectsChanged }: CreateAppFormProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [domain, setDomain] = useState("");
  const [buildPack, setBuildPack] = useState("nixpacks");
  const [portsExposes, setPortsExposes] = useState("3000");
  const [loading, setLoading] = useState(false);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      await coolify.createProject(newProjectName.trim());
      toast.success("Project created");
      setNewProjectName("");
      setShowNewProject(false);
      const p = await coolify.listProjects();
      onProjectsChanged(Array.isArray(p) ? p : []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject || !repoUrl.trim()) {
      toast.error("Project and repository URL are required");
      return;
    }
    setLoading(true);
    try {
      await coolify.createApp({
        projectId: selectedProject,
        name: repoUrl.trim().split("/").pop()?.replace(".git", "") || "app",
        repoUrl: repoUrl.trim(),
        branch: branch || "main",
        domain: domain.trim() || undefined,
        buildPack,
        portsExposes,
      });
      toast.success("Application created! Deploying…");
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect framework by repo URL
  const detectFramework = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes("next") || lower.includes("nuxt")) return "Node.js App";
    if (lower.includes("static") || lower.includes("html")) return "Static Site";
    return "Auto-detect";
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <Rocket className="w-7 h-7 text-accent" />
          </div>
          <CardTitle className="text-xl">Import Git Repository</CardTitle>
          <CardDescription>Connect a GitHub repo and deploy it instantly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {/* Project selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</label>
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.uuid} value={p.uuid}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowNewProject(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Repo URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repository URL</label>
            <Input
              placeholder="https://github.com/user/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            {repoUrl && (
              <p className="text-[11px] text-muted-foreground">
                Detected: {detectFramework(repoUrl)}
              </p>
            )}
          </div>

          {/* Branch & Port - 2 column */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</label>
              <Input placeholder="main" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Port</label>
              <Input placeholder="3000" value={portsExposes} onChange={(e) => setPortsExposes(e.target.value)} />
            </div>
          </div>

          {/* Domain */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Domain (optional)</label>
            <Input placeholder="https://myapp.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>

          {/* Build pack */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Build Pack</label>
            <Select value={buildPack} onValueChange={setBuildPack}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nixpacks">Auto-detect (Nixpacks)</SelectItem>
                <SelectItem value="dockerfile">Dockerfile</SelectItem>
                <SelectItem value="static">Static Site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-3">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button variant="accent" onClick={handleSubmit} disabled={loading} className="flex-[2]">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Rocket className="w-4 h-4 mr-2" /> Deploy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* New project dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Projects group your applications together</DialogDescription>
          </DialogHeader>
          <Input placeholder="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={creatingProject || !newProjectName.trim()}>
              {creatingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
