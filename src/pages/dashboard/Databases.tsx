import { useState, useEffect } from "react";
import { Database } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ContextType { user: User | null; }

const Databases = () => {
  const { user } = useOutletContext<ContextType>();
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("hosting_databases").select("*, hosting_accounts(domain)").eq("user_id", user.id).then(({ data }) => {
      setDatabases(data || []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Databases</h1>
        <p className="text-sm text-muted-foreground">View your database credentials</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : databases.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No databases</h3>
          <p className="text-muted-foreground">Databases are created automatically when you provision a hosting account.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Database</TableHead><TableHead>Username</TableHead><TableHead>Host</TableHead><TableHead>Port</TableHead><TableHead>Website</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {databases.map((db) => (
                <TableRow key={db.id}>
                  <TableCell className="font-medium font-mono text-sm">{db.db_name}</TableCell>
                  <TableCell className="font-mono text-sm">{db.db_username}</TableCell>
                  <TableCell className="font-mono text-sm">{db.db_host}</TableCell>
                  <TableCell>{db.db_port}</TableCell>
                  <TableCell className="text-muted-foreground">{db.hosting_accounts?.domain || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Databases;
