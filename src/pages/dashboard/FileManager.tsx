import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload, FolderOpen, File, Folder, Trash2, Plus, Download,
  Edit3, Loader2, RefreshCw, ArrowLeft, FileText, Image, Code,
  ChevronRight, Search, Save, X, FilePlus, UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listFiles, createFile, createFolder, deleteFiles, renameFile,
  readFile, writeFile, uploadFile,
} from "@/services/hostingService";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

interface FileItem {
  name: string;
  type: "file" | "folder";
  size: string;
  modified: string;
  permissions: string;
}

const FileManager = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState("");
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load hosting accounts
  useEffect(() => {
    if (!user) return;
    supabase
      .from("hosting_accounts")
      .select("id, domain, status")
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

  // Change domain → reset path
  useEffect(() => {
    if (selectedDomain) {
      setCurrentPath(`/home/${selectedDomain}/public_html`);
    }
  }, [selectedDomain]);

  // Fetch files when path changes
  const fetchFiles = useCallback(async () => {
    if (!selectedDomain || !currentPath) return;
    setLoadingFiles(true);
    try {
      const result = await listFiles(selectedDomain, currentPath);
      const data = result?.data || result;

      if (data?.status === 0) {
        toast.error(data.error_message || "Cannot access this directory");
        setFiles([]);
        setLoadingFiles(false);
        return;
      }

      // Parse CyberPanel's numbered response format
      // Each entry: [name, displayName, lastModified, sizeKB, permissions, isDirFlag]
      const parsed: FileItem[] = [];
      for (const key of Object.keys(data)) {
        if (key === "status" || key === "error_message") continue;
        const entry = data[key];
        if (!Array.isArray(entry)) continue;
        parsed.push({
          name: entry[0],
          type: entry[5] === 1 ? "folder" : "file",
          size: entry[3] ? `${entry[3]} KB` : "—",
          modified: entry[2] || "—",
          permissions: entry[4] || "",
        });
      }

      // Sort: folders first, then files
      parsed.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setFiles(parsed);
    } catch (err: any) {
      toast.error(err.message || "Failed to load files");
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [selectedDomain, currentPath]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // File type icon helper
  const getFileIcon = (name: string, type: string) => {
    if (type === "folder") return <Folder className="w-4 h-4 text-accent" />;
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext || ""))
      return <Image className="w-4 h-4 text-accent" />;
    if (["html", "css", "js", "ts", "php", "py", "json", "xml"].includes(ext || ""))
      return <Code className="w-4 h-4 text-primary" />;
    if (["txt", "md", "log", "conf", "htaccess"].includes(ext || ""))
      return <FileText className="w-4 h-4 text-muted-foreground" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const rootPath = `/home/${selectedDomain}/public_html`;
  const breadcrumbs = currentPath.split("/").filter(Boolean);

  const navigateToPath = (index: number) => {
    const newPath = "/" + breadcrumbs.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  const isEditable = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["html", "htm", "css", "js", "ts", "php", "py", "json", "xml", "txt", "md",
      "log", "conf", "htaccess", "env", "yml", "yaml", "toml", "ini", "sh", "sql"].includes(ext);
  };

  // ─── Actions ──────────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(selectedDomain, `${currentPath}/${newFolderName}`);
      toast.success(`Folder "${newFolderName}" created`);
      setCreateFolderOpen(false);
      setNewFolderName("");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await createFile(selectedDomain, `${currentPath}/${newFileName}`);
      toast.success(`File "${newFileName}" created`);
      setCreateFileOpen(false);
      setNewFileName("");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to create file");
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteFiles(selectedDomain, currentPath, [name]);
      toast.success(`"${name}" deleted`);
      setDeleteTarget(null);
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await renameFile(selectedDomain, currentPath, renameTarget, newName);
      toast.success(`Renamed to "${newName}"`);
      setRenameOpen(false);
      setRenameTarget("");
      setNewName("");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    }
  };

  const handleOpenEditor = async (fileName: string) => {
    const filePath = `${currentPath}/${fileName}`;
    setEditorPath(filePath);
    setEditorOpen(true);
    setEditorLoading(true);
    try {
      const result = await readFile(selectedDomain, filePath);
      const data = result?.data || result;
      setEditorContent(data?.fileContents || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to read file");
      setEditorOpen(false);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSaveFile = async () => {
    setSaving(true);
    try {
      await writeFile(selectedDomain, editorPath, editorContent);
      toast.success("File saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    let uploaded = 0;
    try {
      for (const file of uploadFiles) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // strip data:...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await uploadFile(selectedDomain, currentPath, file.name, base64);
        uploaded++;
        setUploadProgress(Math.round((uploaded / uploadFiles.length) * 100));
      }
      toast.success(`${uploaded} file${uploaded > 1 ? "s" : ""} uploaded`);
      setUploadOpen(false);
      setUploadFiles([]);
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setUploadFiles((prev) => [...prev, ...droppedFiles]);
  };

  const displayFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

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
          <Button variant="outline" size="sm" onClick={() => setCreateFileOpen(true)}>
            <FilePlus className="w-4 h-4 mr-1" /> New File
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Folder
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <UploadCloud className="w-4 h-4 mr-1" /> Upload
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
            <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loadingFiles}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingFiles ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto pb-1">
            <button
              onClick={() => setCurrentPath(rootPath)}
              className="text-accent hover:underline font-medium shrink-0"
            >
              public_html
            </button>
            {currentPath !== rootPath && breadcrumbs.slice(rootPath.split("/").filter(Boolean).length).map((part, i) => {
              const absIndex = rootPath.split("/").filter(Boolean).length + i;
              return (
                <span key={absIndex} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <button
                    onClick={() => navigateToPath(absIndex)}
                    className={`hover:underline ${absIndex === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-accent"}`}
                  >
                    {part}
                  </button>
                </span>
              );
            })}
          </div>

          {/* File listing */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Parent directory */}
                    {currentPath !== rootPath && (
                      <TableRow
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => {
                          const parts = currentPath.split("/");
                          parts.pop();
                          const parent = parts.join("/") || "/";
                          if (parent.startsWith(`/home/${selectedDomain}`)) {
                            setCurrentPath(parent);
                          }
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
                        <TableCell />
                      </TableRow>
                    )}
                    {displayFiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No files match your search" : "This directory is empty"}
                        </TableCell>
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
                        <TableCell className="text-sm text-muted-foreground">{file.size}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{file.modified}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono text-xs">{file.permissions}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {file.type === "file" && isEditable(file.name) && (
                              <Button variant="ghost" size="sm" title="Edit" onClick={() => handleOpenEditor(file.name)}>
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Rename"
                              onClick={() => {
                                setRenameTarget(file.name);
                                setNewName(file.name);
                                setRenameOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              title="Delete"
                              onClick={() => setDeleteTarget(file.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>

          {/* Info banner */}
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Note:</strong> File operations are processed on your server.
              Your web root is at{" "}
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
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create File Dialog */}
      <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>Create a new file in {currentPath}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>File Name</Label>
            <Input
              placeholder="index.html"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFileOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFile}>Create File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Rename "{renameTarget}"</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The file or folder will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Code Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              {editorPath.split("/").pop()}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{editorPath}</DialogDescription>
          </DialogHeader>
          {editorLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="flex-1 min-h-[400px] font-mono text-sm resize-none"
              spellCheck={false}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
            <Button onClick={handleSaveFile} disabled={saving || editorLoading}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!uploading) { setUploadOpen(open); if (!open) setUploadFiles([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>Upload files to {currentPath}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById("file-upload-input")?.click()}
            >
              <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Drag & drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Max 20MB per file</p>
              <input
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setUploadFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }}
              />
            </div>
            {uploadFiles.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <File className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    {!uploading && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{uploadProgress}% complete</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadFiles([]); }} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}>
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload {uploadFiles.length > 0 && `(${uploadFiles.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileManager;
