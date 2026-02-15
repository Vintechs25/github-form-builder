import { useState } from "react";
import {
  ArrowLeft, Rocket, RefreshCw, StopCircle, Globe, GitBranch,
  ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";
import { LogViewer } from "./LogViewer";
import { AppEnvVars } from "./AppEnvVars";
import { AppDomains } from "./AppDomains";
import { AppSettings } from "./AppSettings";
import * as coolify from "@/services/coolifyService";
import type { App, DetailTab } from "./types";

interface AppDetailProps {
  app: App;
  onBack: () => void;
  onRefresh: () => void;
}

export function AppDetail({ app, onBack, onRefresh }: AppDetailProps) {
  const [tab, setTab] = useState<DetailTab>("deployments");
  const [actionLoading, setActionLoading] = useState(false);
  const [stopTarget, setStopTarget] = useState(false);

  const isRunning = (app.status || "").toLowerCase().includes("running");
  const domainDisplay = app.fqdn ? String(app.fqdn).replace(/^https?:\/\//, "") : null;
  const repoShort = app.git_repository
    ? String(app.git_repository).replace("https://github.com/", "").replace(".git", "")
    : null;

  const handleDeploy = async () => {
    setActionLoading(true);
    try {
      await coolify.deployApp(app.uuid);
      toast.success("Deployment started");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeploy = async () => {
    setActionLoading(true);
    try {
      await coolify.redeployApp(app.uuid);
      toast.success("Redeployment started");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await coolify.stopApp(app.uuid);
      toast.success("Application stopped");
      setStopTarget(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold truncate">{app.name || app.uuid}</h2>
              <StatusBadge status={app.status as string} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              {repoShort && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {repoShort}
                  {app.git_branch && <span className="text-accent font-medium ml-0.5">({String(app.git_branch)})</span>}
                </span>
              )}
              {domainDisplay && (
                <a
                  href={String(app.fqdn)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-accent transition-colors"
                >
                  <Globe className="w-3 h-3" />
                  {domainDisplay}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="accent" onClick={handleDeploy} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Rocket className="w-3 h-3 mr-1" />}
            Deploy
          </Button>
          <Button size="sm" variant="outline" onClick={handleRedeploy} disabled={actionLoading}>
            <RefreshCw className="w-3 h-3 mr-1" /> Redeploy
          </Button>
          {isRunning && (
            <Button size="sm" variant="outline" onClick={() => setStopTarget(true)} disabled={actionLoading}>
              <StopCircle className="w-3 h-3 mr-1" /> Stop
            </Button>
          )}
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as DetailTab)} className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
          {(["deployments", "logs", "domains", "envs", "settings"] as DetailTab[]).map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm capitalize"
            >
              {t === "envs" ? "Environment" : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="deployments" className="mt-6">
          <div className="space-y-4">
            {/* Current deployment info */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Current Deployment</h3>
                <StatusBadge status={app.status as string} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Branch</p>
                  <p className="text-sm font-medium mt-0.5">{app.git_branch || "main"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Build Pack</p>
                  <p className="text-sm font-medium mt-0.5 capitalize">{String(app.build_pack || "nixpacks")}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Created</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {app.created_at ? new Date(String(app.created_at)).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Last Updated</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {app.updated_at ? new Date(String(app.updated_at)).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="accent" onClick={handleDeploy} disabled={actionLoading}>
                <Rocket className="w-3 h-3 mr-1" /> Trigger Deploy
              </Button>
              <Button size="sm" variant="outline" onClick={handleRedeploy} disabled={actionLoading}>
                <RefreshCw className="w-3 h-3 mr-1" /> Redeploy
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogViewer appId={app.uuid} />
        </TabsContent>

        <TabsContent value="domains" className="mt-6">
          <AppDomains app={app} />
        </TabsContent>

        <TabsContent value="envs" className="mt-6">
          <AppEnvVars appId={app.uuid} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AppSettings app={app} onDeleted={onBack} />
        </TabsContent>
      </Tabs>

      {/* Stop confirm */}
      <AlertDialog open={stopTarget} onOpenChange={setStopTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the application. Users will no longer be able to access it until you redeploy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop} disabled={actionLoading}>Stop</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
