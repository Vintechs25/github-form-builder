import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as coolify from "@/services/coolifyService";
import type { App } from "./types";

interface AppSettingsProps {
  app: App;
  onDeleted: () => void;
}

export function AppSettings({ app, onDeleted }: AppSettingsProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await coolify.deleteApp(app.uuid);
      toast.success("Application deleted");
      onDeleted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">General</h3>
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Name</p>
            <p className="text-sm font-medium mt-0.5">{app.name || "Unnamed"}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">UUID</p>
            <p className="text-sm font-mono text-muted-foreground mt-0.5 truncate">{app.uuid}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Repository</p>
            <p className="text-sm font-mono text-muted-foreground mt-0.5 truncate">
              {app.git_repository ? String(app.git_repository).replace("https://github.com/", "") : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Branch</p>
            <p className="text-sm font-medium mt-0.5">{app.git_branch || "main"}</p>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border border-destructive/30 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-xs text-muted-foreground">
          Deleting this application will permanently remove it, along with all its configurations and volumes.
        </p>
        <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="w-3 h-3 mr-1" /> Delete Application
        </Button>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{app.name || app.uuid}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the application, its configuration, and volumes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
