import { GitBranch, Globe, ExternalLink } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { App } from "./types";
import { formatDistanceToNow } from "date-fns";

interface AppCardProps {
  app: App;
  onClick: () => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
  const repoShort = app.git_repository
    ? String(app.git_repository).replace("https://github.com/", "").replace(".git", "")
    : null;

  const domainDisplay = app.fqdn
    ? String(app.fqdn).replace(/^https?:\/\//, "")
    : null;

  const updatedAgo = app.updated_at
    ? formatDistanceToNow(new Date(String(app.updated_at)), { addSuffix: true })
    : null;

  const isRunning = (app.status || "").toLowerCase().includes("running");

  return (
    <div
      onClick={onClick}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
    >
      {/* Preview area */}
      <div className="h-32 bg-muted/30 border-b border-border relative flex items-center justify-center overflow-hidden">
        {domainDisplay ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <Globe className="w-6 h-6 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">{domainDisplay}</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
              <GitBranch className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">No domain configured</p>
          </div>
        )}

        {/* Status dot overlay */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={app.status as string} />
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground truncate text-sm">
            {app.name || app.uuid}
          </h3>
          {isRunning && domainDisplay && (
            <a
              href={String(app.fqdn)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-accent transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {repoShort && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GitBranch className="w-3 h-3 shrink-0" />
            <span className="truncate">{repoShort}</span>
            {app.git_branch && (
              <span className="text-accent font-medium">({String(app.git_branch)})</span>
            )}
          </div>
        )}

        {updatedAgo && (
          <p className="text-[11px] text-muted-foreground/70">
            Updated {updatedAgo}
          </p>
        )}
      </div>
    </div>
  );
}
