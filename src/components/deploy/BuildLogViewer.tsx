import { useState, useEffect, useRef, useCallback } from "react";
import { Terminal, Loader2, Circle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as coolify from "@/services/coolifyService";
import type { Deployment } from "./types";

interface BuildLogViewerProps {
  appId: string;
}

const POLL_INTERVAL = 3000;

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  in_progress: { icon: Loader2, color: "text-yellow-500", label: "Building" },
  finished: { icon: CheckCircle2, color: "text-green-500", label: "Success" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-muted-foreground", label: "Cancelled" },
};

function getStatusConfig(status: string) {
  const lower = (status || "").toLowerCase();
  for (const [key, cfg] of Object.entries(STATUS_CONFIG)) {
    if (lower.includes(key)) return cfg;
  }
  return STATUS_CONFIG.queued;
}

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function BuildLogViewer({ appId }: BuildLogViewerProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [buildLog, setBuildLog] = useState("");
  const [buildStatus, setBuildStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Fetch deployment list
  const fetchDeployments = useCallback(async () => {
    try {
      const data = await coolify.listDeployments(appId);
      const list = Array.isArray(data) ? data : data?.data || data?.deployments || [];
      setDeployments(list);
      // Auto-select latest if none selected
      if (!selectedUuid && list.length > 0) {
        setSelectedUuid(list[0].uuid || list[0].deployment_uuid);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [appId, selectedUuid]);

  // Fetch build logs for selected deployment
  const fetchBuildLog = useCallback(async (uuid: string) => {
    try {
      const data = await coolify.getBuildLogs(appId, uuid);
      const log = typeof data === "string"
        ? data
        : data?.deployment_log
          ? (Array.isArray(data.deployment_log)
            ? data.deployment_log.map((l: any) => l.output || l.line || l).join("\n")
            : String(data.deployment_log))
          : data?.logs || data?.log || data?.message || JSON.stringify(data, null, 2);
      setBuildLog(typeof log === "string" ? log : JSON.stringify(log, null, 2));
      setBuildStatus(data?.status || "");
    } catch (e: any) {
      setBuildLog(`Error fetching build logs: ${e.message}`);
    }
  }, [appId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!userScrolledUp.current && scrollViewportRef.current) {
      const vp = scrollViewportRef.current;
      vp.scrollTop = vp.scrollHeight;
    }
  }, [buildLog]);

  // Track user scroll
  const handleScroll = useCallback(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;
    const nearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 60;
    userScrolledUp.current = !nearBottom;
  }, []);

  // Initial load
  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // Poll logs when a deployment is active
  useEffect(() => {
    if (!selectedUuid) return;

    setLogLoading(true);
    fetchBuildLog(selectedUuid).finally(() => setLogLoading(false));

    const isActive = deployments.some((d) => {
      const uuid = d.uuid || (d as any).deployment_uuid;
      if (uuid !== selectedUuid) return false;
      const s = (d.status || "").toLowerCase();
      return s.includes("in_progress") || s.includes("queued") || s.includes("building");
    });

    if (isActive) {
      pollingRef.current = setInterval(() => {
        fetchBuildLog(selectedUuid);
        fetchDeployments();
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedUuid, deployments.length, fetchBuildLog, fetchDeployments]);

  const selected = deployments.find(
    (d) => (d.uuid || (d as any).deployment_uuid) === selectedUuid
  );
  const selectedStatus = getStatusConfig(selected?.status || buildStatus);
  const StatusIcon = selectedStatus.icon;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Terminal className="w-4 h-4" /> Deployment History & Build Logs
      </h3>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading deployments…
        </div>
      ) : deployments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deployments found. Deploy your app to see build logs here.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Deployment list */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Deployments ({deployments.length})
              </p>
            </div>
            <ScrollArea className="max-h-[50vh]">
              <div className="divide-y divide-border">
                {deployments.slice(0, 20).map((dep) => {
                  const uuid = dep.uuid || (dep as any).deployment_uuid;
                  const cfg = getStatusConfig(dep.status);
                  const Icon = cfg.icon;
                  const isSelected = uuid === selectedUuid;
                  const isBuilding = cfg.label === "Building";

                  return (
                    <button
                      key={uuid}
                      onClick={() => {
                        setSelectedUuid(uuid);
                        userScrolledUp.current = false;
                      }}
                      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                        isSelected ? "bg-muted/60 border-l-2 border-l-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color} ${isBuilding ? "animate-spin" : ""}`} />
                        <span className="text-xs font-mono truncate">{uuid.slice(0, 8)}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                          {cfg.label}
                        </Badge>
                      </div>
                      {dep.created_at && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                          {formatTimestamp(dep.created_at)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Build log output */}
          <div className="border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-3.5 h-3.5 ${selectedStatus.color} ${selectedStatus.label === "Building" ? "animate-spin" : ""}`} />
                <span className="text-xs font-medium">{selectedStatus.label}</span>
                {selectedUuid && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {selectedUuid.slice(0, 12)}
                  </span>
                )}
              </div>
              {selectedStatus.label === "Building" && (
                <span className="text-[10px] text-yellow-500 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  Live
                </span>
              )}
            </div>
            <div
              ref={scrollViewportRef}
              onScroll={handleScroll}
              className="bg-[hsl(222,47%,8%)] text-[hsl(152,69%,70%)] font-mono text-xs p-4 overflow-auto max-h-[50vh] min-h-[300px] whitespace-pre-wrap"
            >
              {logLoading && !buildLog ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading build logs…
                </div>
              ) : buildLog ? (
                <>
                  {buildLog}
                  <div ref={logEndRef} />
                </>
              ) : (
                <span className="text-muted-foreground">No build output available yet.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
