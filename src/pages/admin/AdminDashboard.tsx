import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Server, Globe, ShoppingBag, CreditCard, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0, services: 0, domains: 0, orders: 0, revenue: 0, tickets: 0,
  });

  useEffect(() => {
    const load = async () => {
      const [
        { count: users },
        { count: services },
        { count: domains },
        { count: orders },
        { data: invoices },
        { count: tickets },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("hosting_accounts").select("*", { count: "exact", head: true }),
        supabase.from("domains").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("amount, status"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({
        users: users || 0,
        services: services || 0,
        domains: domains || 0,
        orders: orders || 0,
        revenue: invoices?.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0) || 0,
        tickets: tickets || 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-500" },
    { label: "Active Services", value: stats.services, icon: Server, color: "text-accent" },
    { label: "Domains", value: stats.domains, icon: Globe, color: "text-purple-500" },
    { label: "Orders", value: stats.orders, icon: ShoppingBag, color: "text-orange-500" },
    { label: "Revenue (KES)", value: stats.revenue.toLocaleString(), icon: CreditCard, color: "text-gold" },
    { label: "Open Tickets", value: stats.tickets, icon: HelpCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and quick stats</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
