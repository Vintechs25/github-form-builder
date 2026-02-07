import { Upload, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const FileManager = () => (
  <div className="space-y-6">
    <div>
      <h1 className="font-display font-semibold text-lg">File Manager</h1>
      <p className="text-sm text-muted-foreground">Upload and manage your website files</p>
    </div>
    <div className="bg-card rounded-xl border border-border p-12 text-center">
      <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-display font-semibold text-lg mb-2">File Manager</h3>
      <p className="text-muted-foreground mb-4">File management will be available once your hosting account is provisioned via CyberPanel.</p>
      <Button variant="outline" disabled><Upload className="w-4 h-4 mr-1" /> Upload Files</Button>
    </div>
  </div>
);

export default FileManager;
