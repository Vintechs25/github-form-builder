import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Database, Upload, Mail, ChevronRight, Plus, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface ContextType {
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
  user: User | null;
}

const Overview = () => {
  const { profile, user } = useOutletContext<ContextType>();
  const [hostingAccounts, setHostingAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState({ websites: 0, pendingDns: 0, storageMb: 0, bandwidthMb: 0, tickets: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: accounts }, { data: tickets }] = await Promise.all([
        supabase.from("hosting_accounts").select("*").eq("user_id", user.id),
        supabase.from("support_tickets").select("id").eq("user_id", user.id).in("status", ["open", "in_progress"]),
      ]);
      const accs = accounts || [];
      setHostingAccounts(accs);
      setStats({
        websites: accs.filter((a) => a.status === "active").length,
        pendingDns: accs.filter((a) => a.status === "pending_dns").length,
        storageMb: accs.reduce((s, a) => s + (a.storage_used_mb || 0), 0),
        bandwidthMb: accs.reduce((s, a) => s + (a.bandwidth_used_mb || 0), 0),
        tickets: tickets?.length || 0,
      });
    };
    load();
  }, [user]);

  const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

  const statCards = [
    { label: "Active Websites", value: stats.websites.toString(), icon: Globe },
    { label: "Awaiting DNS", value: stats.pendingDns.toString(), icon: Clock },
    { label: "Storage Used", value: formatMb(stats.storageMb), icon: Database },
    { label: "Open Tickets", value: stats.tickets.toString(), icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your hosting accounts</p>
        </div>
        <Link to="/dashboard/buy-hosting">
          <Button variant="accent" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Buy Hosting
          </Button>
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-accent/10 to-gold/10 rounded-2xl p-6 border border-accent/20">
        <h2 className="font-display font-bold text-xl mb-2">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}! 👋
        </h2>
        <p className="text-muted-foreground">Your hosting dashboard is ready. Start by purchasing a hosting plan or exploring our features.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
              <stat.icon className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Pending DNS alert */}
      {stats.pendingDns > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-warning/5 border border-warning/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                {stats.pendingDns} website{stats.pendingDns > 1 ? "s" : ""} awaiting DNS verification
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Point your domain nameservers to <span className="font-mono font-semibold text-foreground">ns1.vintechdev.store</span> &{" "}
                <span className="font-mono font-semibold text-foreground">ns2.vintechdev.store</span> to activate hosting.
              </p>
              <Link to="/dashboard/websites">
                <Button variant="outline" size="sm" className="mt-3">View Websites <ChevronRight className="w-3 h-3 ml-1" /></Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Your Websites</h2>
          <Link to="/dashboard/websites">
            <Button variant="ghost" size="sm">View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>

        {hostingAccounts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No websites yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Purchase a hosting plan to get started.</p>
            <Link to="/dashboard/buy-hosting"><Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> Buy Hosting</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {hostingAccounts.slice(0, 4).map((account, i) => (
              <motion.div key={account.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      account.status === "active" ? "bg-success/10" :
                      account.status === "pending_dns" ? "bg-warning/10" : "bg-accent/10"
                    }`}>
                      {account.status === "pending_dns" ? (
                        <Clock className="w-5 h-5 text-warning" />
                      ) : account.status === "active" ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Globe className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{account.domain}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{account.hosting_type?.replace("_", " ")}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    account.status === "active" ? "bg-success/10 text-success" :
                    account.status === "pending_dns" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {account.status === "pending_dns" ? "Awaiting DNS" : account.status}
                  </span>
                </div>
                {account.status === "active" && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Storage</span>
                        <span>{formatMb(account.storage_used_mb)}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((account.storage_used_mb / 5120) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {account.status === "pending_dns" && (
                  <p className="text-xs text-muted-foreground">Point nameservers to activate → <Link to="/dashboard/websites" className="text-accent underline">View details</Link></p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Upload, label: "Upload Files", to: "/dashboard/files" },
            { icon: Database, label: "Manage DB", to: "/dashboard/databases" },
            { icon: Mail, label: "Create Email", to: "/dashboard/email" },
            { icon: Globe, label: "Add Domain", to: "/dashboard/domains" },
          ].map((action) => (
            <Link key={action.label} to={action.to} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <action.icon className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
