import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, Server, Globe, ShoppingBag, CreditCard, HelpCircle,
  TrendingUp, AlertTriangle, Activity, ArrowUpRight, Clock, Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface RecentOrder {
  id: string;
  type: string;
  status: string;
  total_amount: number;
  created_at: string;
  domain_name: string | null;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0, websites: 0, apps: 0, domains: 0,
    orders: 0, revenue: 0, pendingPayments: 0, openTickets: 0,
    activeServices: 0, suspendedServices: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: users },
        { count: websites },
        { count: apps },
        { count: domains },
        { count: orders },
        { data: invoices },
        { count: openTickets },
        { count: activeServices },
        { count: suspendedServices },
        { data: recentOrd },
        { data: recentTix },
        { data: maintSetting },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("hosting_accounts").select("*", { count: "exact", head: true }).eq("hosting_type", "shared_hosting"),
        supabase.from("hosting_accounts").select("*", { count: "exact", head: true }).eq("hosting_type", "application"),
        supabase.from("domains").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("amount, status"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("hosting_accounts").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("hosting_accounts").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("orders").select("id, type, status, total_amount, created_at, domain_name").order("created_at", { ascending: false }).limit(5),
        supabase.from("support_tickets").select("id, subject, status, priority, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("platform_settings").select("value").eq("key", "maintenance").maybeSingle(),
      ]);

      const paidRevenue = invoices?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0) || 0;
      const pending = invoices?.filter(i => i.status === "unpaid").reduce((s, i) => s + Number(i.amount), 0) || 0;

      setStats({
        users: users || 0,
        websites: websites || 0,
        apps: apps || 0,
        domains: domains || 0,
        orders: orders || 0,
        revenue: paidRevenue,
        pendingPayments: pending,
        openTickets: openTickets || 0,
        activeServices: activeServices || 0,
        suspendedServices: suspendedServices || 0,
      });
      setRecentOrders(recentOrd || []);
      setRecentTickets(recentTix || []);
      setMaintenanceMode((maintSetting?.value as any)?.enabled || false);
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", link: "/admin/users" },
    { label: "Websites", value: stats.websites, icon: Globe, color: "text-purple-500", bg: "bg-purple-500/10", link: "/admin/services" },
    { label: "Applications", value: stats.apps, icon: Rocket, color: "text-accent", bg: "bg-accent/10", link: "/admin/services" },
    { label: "Domains", value: stats.domains, icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10", link: "/admin/domains" },
    { label: "Revenue (KES)", value: stats.revenue.toLocaleString(), icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", link: "/admin/invoices" },
    { label: "Pending (KES)", value: stats.pendingPayments.toLocaleString(), icon: CreditCard, color: "text-orange-500", bg: "bg-orange-500/10", link: "/admin/invoices" },
    { label: "Open Tickets", value: stats.openTickets, icon: HelpCircle, color: "text-destructive", bg: "bg-destructive/10", link: "/admin/tickets" },
    { label: "Total Orders", value: stats.orders, icon: ShoppingBag, color: "text-indigo-500", bg: "bg-indigo-500/10", link: "/admin/orders" },
  ];

  const totalServices = stats.activeServices + stats.suspendedServices;
  const activePercent = totalServices > 0 ? Math.round((stats.activeServices / totalServices) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">System Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time platform overview</p>
        </div>
        {maintenanceMode && (
          <Badge variant="destructive" className="gap-1.5 py-1 px-3">
            <AlertTriangle className="w-3.5 h-3.5" /> Maintenance Mode Active
          </Badge>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={card.link} className="block bg-card rounded-xl border border-border p-4 hover:border-accent/40 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xl font-display font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Service Health + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Service Health */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold text-sm">Service Health</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium text-green-500">{stats.activeServices}</span>
            </div>
            <Progress value={activePercent} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Suspended</span>
              <span className="font-medium text-destructive">{stats.suspendedServices}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{activePercent}% uptime rate across {totalServices} services</p>
            </div>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-sm">Recent Orders</h2>
            </div>
            <Link to="/admin/orders" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {recentOrders.length === 0 && <p className="text-xs text-muted-foreground">No orders yet</p>}
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-xs truncate">{order.domain_name || order.type}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">KES {order.total_amount}</span>
                  <Badge variant={order.status === "completed" ? "default" : order.status === "pending" ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Tickets */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-sm">Recent Tickets</h2>
            </div>
            <Link to="/admin/tickets" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {recentTickets.length === 0 && <p className="text-xs text-muted-foreground">No tickets yet</p>}
            {recentTickets.map(ticket => (
              <div key={ticket.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-xs truncate">{ticket.subject}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={ticket.priority === "high" ? "destructive" : ticket.status === "open" ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                  {ticket.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
