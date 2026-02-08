import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, Lock, CheckCircle, AlertTriangle, RefreshCw, Loader2,
  ShieldCheck, ShieldAlert, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { issueSSL } from "@/services/hostingService";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface ContextType { user: User | null; }

const Security = () => {
  const { user } = useOutletContext<ContextType>();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingSSL, setIssuingSSL] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("hosting_accounts")
      .select("id, domain, ssl_enabled, status")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setAccounts(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleIssueSSL = async (domain: string, accountId: string) => {
    setIssuingSSL(domain);
    try {
      await issueSSL(domain);
      // Update local state
      await supabase
        .from("hosting_accounts")
        .update({ ssl_enabled: true })
        .eq("id", accountId);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, ssl_enabled: true } : a))
      );
      toast.success(`SSL certificate issued for ${domain}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to issue SSL certificate");
    }
    setIssuingSSL(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const secureCount = activeAccounts.filter((a) => a.ssl_enabled).length;
  const insecureCount = activeAccounts.filter((a) => !a.ssl_enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">SSL / Security</h1>
        <p className="text-sm text-muted-foreground">Manage SSL certificates and security settings</p>
      </div>

      {/* SSL Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{secureCount}</p>
              <p className="text-sm text-muted-foreground">Secured</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{insecureCount}</p>
              <p className="text-sm text-muted-foreground">Not Secured</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Total Domains</p>
            </div>
          </div>
        </motion.div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No Hosting Accounts</h3>
          <p className="text-muted-foreground">SSL certificates are issued automatically via Let's Encrypt when hosting is provisioned.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">SSL Certificate Status</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>SSL Status</TableHead>
                  <TableHead>Hosting Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.ssl_enabled ? (
                          <Lock className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                        <span className="font-medium">{a.domain}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.ssl_enabled ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="w-3 h-3 mr-1" /> Secure
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Not Secure
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Let's Encrypt
                    </TableCell>
                    <TableCell className="text-right">
                      {a.status === "active" && (
                        <Button
                          variant={a.ssl_enabled ? "outline" : "accent"}
                          size="sm"
                          disabled={issuingSSL === a.domain}
                          onClick={() => handleIssueSSL(a.domain, a.id)}
                        >
                          {issuingSSL === a.domain ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-1" />
                          )}
                          {a.ssl_enabled ? "Renew SSL" : "Issue SSL"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* SSL Info */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" /> About SSL Certificates
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• SSL certificates are issued free via <strong className="text-foreground">Let's Encrypt</strong></li>
          <li>• Certificates auto-renew every 90 days</li>
          <li>• SSL is required for HTTPS and secure connections</li>
          <li>• All active hosting accounts have SSL issued automatically during provisioning</li>
        </ul>
      </div>
    </div>
  );
};

export default Security;
