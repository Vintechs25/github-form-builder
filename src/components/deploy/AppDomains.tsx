import { useState } from "react";
import { Globe, ExternalLink, Copy, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { App } from "./types";

interface AppDomainsProps {
  app: App;
}

export function AppDomains({ app }: AppDomainsProps) {
  const domains = app.fqdn
    ? String(app.fqdn).split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  const copyDomain = (d: string) => {
    navigator.clipboard.writeText(d);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Domains</h3>

      {domains.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No domains configured</p>
          <p className="text-xs text-muted-foreground">
            Add a domain when creating the app or update it in your deployment platform settings.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map((domain) => {
            const isHttps = domain.startsWith("https://");
            const display = domain.replace(/^https?:\/\//, "");

            return (
              <div key={domain} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  {isHttps ? <Shield className="w-4 h-4 text-success" /> : <Globe className="w-4 h-4 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium truncate">{display}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isHttps ? "SSL Active" : "No SSL"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => copyDomain(domain)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <a href={domain} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="w-7 h-7">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
