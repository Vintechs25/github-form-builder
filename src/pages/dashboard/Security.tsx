import { Shield, Lock, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ContextType { user: User | null; }

const Security = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("hosting_accounts").select("domain, ssl_enabled, status").eq("user_id", user.id).then(({ data }) => setAccounts(data || []));
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">SSL / Security</h1>
        <p className="text-sm text-muted-foreground">Manage SSL certificates and security settings</p>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No hosting accounts</h3>
          <p className="text-muted-foreground">SSL certificates are issued automatically via Let's Encrypt when hosting is provisioned.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Domain</TableHead><TableHead>SSL Status</TableHead><TableHead>Hosting Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{a.domain}</TableCell>
                  <TableCell>
                    {a.ssl_enabled ? (
                      <Badge variant="outline" className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning"><Lock className="w-3 h-3 mr-1" /> Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Security;
