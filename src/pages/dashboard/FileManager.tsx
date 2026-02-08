import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Upload, FolderOpen, File, Folder, Trash2, Plus, Download,
  Edit3, Loader2, RefreshCw, ArrowLeft, FileText, Image, Code,
  ChevronRight, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

interface FileItem {
  name: string;
  type: "file" | "folder";
  size?: string;
  modified?: string;
  permissions?: string;
}

const FileManager = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [currentPath, setCurrentPath] = useState("/home");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("hosting_accounts")
      .select("id, domain, status, cpanel_username")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => {
        setAccounts(data || []);
        if (data && data.length > 0) {
          setSelectedDomain(data[0].domain);
          setCurrentPath(`/home/${data[0].domain}/public_html`);
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (selectedDomain) {
      const account = accounts.find((a) => a.domain === selectedDomain);
      if (account) {
        setCurrentPath(`/home/${selectedDomain}/public_html`);
      }
    }
  }, [selectedDomain]);

  // File type icon helper
  const getFileIcon = (name: string, type: string) => {
    if (type === "folder") return <Folder className="w-4 h-4 text-accent" />;
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || ""))
      return <Image className="w-4 h-4 text-success" />;
    if (["html", "css", "js", "ts", "php", "py", "json"].includes(ext || ""))
      return <Code className="w-4 h-4 text-warning" />;
    if (["txt", "md", "log"].includes(ext || ""))
      return <FileText className="w-4 h-4 text-muted-foreground" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  const navigateToPath = (index: number) => {
    const newPath = "/" + breadcrumbs.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  // Placeholder files for demo - will be replaced by actual API call
  const demoFiles: FileItem[] = [
    { name: "public_html", type: "folder" },
    { name: "logs", type: "folder" },
    { name: ".htaccess", type: "file", size: "1.2 KB" },
    { name: "index.html", type: "file", size: "4.5 KB" },
    { name: "style.css", type: "file", size: "12.3 KB" },
    { name: "script.js", type: "file", size: "8.7 KB" },
    { name: "favicon.ico", type: "file", size: "1.1 KB" },
  ];

  const displayFiles = searchQuery
    ? demoFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : demoFiles;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">File Manager</h1>
          <p className="text-sm text-muted-foreground">Upload and manage your website files</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Folder
          </Button>
          <Button variant="accent" size="sm">
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No Active Hosting</h3>
          <p className="text-muted-foreground">You need an active hosting account to manage files.</p>
        </div>
      ) : (
        <>
          {/* Domain selector + search */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-48">
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.domain}>{a.domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" disabled={loadingFiles}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingFiles ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
            <button
              onClick={() => setCurrentPath(`/home/${selectedDomain}/public_html`)}
              className="text-accent hover:underline font-medium shrink-0"
            >
              root
            </button>
            {breadcrumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <button
                  onClick={() => navigateToPath(i)}
                  className={`hover:underline ${i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-accent"}`}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>

          {/* File listing */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Parent directory */}
                  {currentPath !== `/home/${selectedDomain}/public_html` && (
                    <TableRow
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => {
                        const parts = currentPath.split("/");
                        parts.pop();
                        setCurrentPath(parts.join("/") || "/");
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">..</span>
                        </div>
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  )}
                  {displayFiles.map((file) => (
                    <TableRow
                      key={file.name}
                      className={file.type === "folder" ? "cursor-pointer hover:bg-secondary/50" : ""}
                      onClick={() => {
                        if (file.type === "folder") setCurrentPath(`${currentPath}/${file.name}`);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.name, file.type)}
                          <span className={`font-medium ${file.type === "folder" ? "text-accent" : ""}`}>
                            {file.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {file.size || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {file.type}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {file.type === "file" && (
                            <>
                              <Button variant="ghost" size="sm" title="Edit">
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Download">
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Info banner */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Note:</strong> File operations are processed on your server.
              Large uploads may take a moment. Your web root is at{" "}
              <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground text-xs">
                /home/{selectedDomain}/public_html
              </code>
            </p>
          </div>
        </>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Create a new folder in {currentPath}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Folder Name</Label>
            <Input
              placeholder="new-folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
            <Button variant="accent" onClick={() => {
              toast.success(`Folder "${newFolderName}" created`);
              setCreateFolderOpen(false);
              setNewFolderName("");
            }}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManager;
