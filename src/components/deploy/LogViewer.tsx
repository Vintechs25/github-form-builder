import { useState } from "react";
import { Terminal, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as coolify from "@/services/coolifyService";

interface LogViewerProps {
  appId: string;
}

export function LogViewer({ appId }: LogViewerProps) {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await coolify.getLogs(appId);
      if (typeof data === "string") {
        setLogs(data);
      } else if (Array.isArray(data)) {
        setLogs(
          data.map((l: any) => (typeof l === "string" ? l : l.output || l.line || JSON.stringify(l))).join("\n")
        );
      } else if (data?.logs) {
        setLogs(typeof data.logs === "string" ? data.logs : JSON.stringify(data.logs, null, 2));
      } else if (data?.message) {
        setLogs(data.message);
      } else {
        setLogs(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setLogs(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Terminal className="w-4 h-4" /> Runtime Logs
        </h3>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          {loaded ? "Refresh" : "Load Logs"}
        </Button>
      </div>

      <div className="bg-[hsl(222,47%,8%)] text-[hsl(152,69%,70%)] rounded-lg p-4 font-mono text-xs overflow-auto max-h-[50vh] min-h-[200px] whitespace-pre-wrap border border-border">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading logs…
          </div>
        ) : loaded ? (
          logs || "No logs available"
        ) : (
          <span className="text-muted-foreground">Click "Load Logs" to view application output</span>
        )}
      </div>
    </div>
  );
}
