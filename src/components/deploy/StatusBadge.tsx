import { CheckCircle2, Clock, StopCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const s = (status || "unknown").toLowerCase();

  if (s.includes("running"))
    return (
      <Badge className="bg-success/10 text-success border-success/20">
        <span className="w-2 h-2 rounded-full bg-success mr-1.5 animate-pulse" />
        Running
      </Badge>
    );

  if (s.includes("building") || s.includes("starting") || s.includes("restarting"))
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Building
      </Badge>
    );

  if (s.includes("stopped") || s.includes("exited"))
    return (
      <Badge variant="secondary">
        <StopCircle className="w-3 h-3 mr-1" />
        Stopped
      </Badge>
    );

  if (s.includes("error") || s.includes("failed"))
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );

  return <Badge variant="outline">{status || "Unknown"}</Badge>;
}

export function getStatusColor(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("running")) return "text-success";
  if (s.includes("building") || s.includes("starting")) return "text-warning";
  if (s.includes("error") || s.includes("failed")) return "text-destructive";
  return "text-muted-foreground";
}
