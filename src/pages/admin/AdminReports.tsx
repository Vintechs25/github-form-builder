import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, DollarSign, Activity } from "lucide-react";

const AdminReports = () => {
  const [stats, setStats] = useState({
    totalRevenue: 0, paidInvoices: 0, unpaidInvoices: 0, activeServices: 0, suspendedServices: 0,
  });

  useEffect(() => {
    const load = async () => {
      const [{ data: invoices }, { data: services }] = await Promise.all([
        supabase.from("invoices").select("amount, status"),
        supabase.from("hosting_accounts").select("status"),
      ]);
      const inv = invoices || [];
      const svc = services || [];
      setStats({
        totalRevenue: inv.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0),
        paidInvoices: inv.filter(i => i.status === "paid").length,
        unpaidInvoices: inv.filter(i => i.status !== "paid").length,
        activeServices: svc.filter(s => s.status === "active").length,
        suspendedServices: svc.filter(s => s.status === "suspended").length,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Revenue", value: `KES ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, desc: "From paid invoices" },
    { label: "Paid Invoices", value: stats.paidInvoices, icon: TrendingUp, desc: "Successfully collected" },
    { label: "Unpaid Invoices", value: stats.unpaidInvoices, icon: BarChart3, desc: "Pending collection" },
    { label: "Active Services", value: stats.activeServices, icon: Activity, desc: `${stats.suspendedServices} suspended` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Reports</h1>
        <p className="text-sm text-muted-foreground">Financial and service overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-display font-bold">{card.value}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{card.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminReports;
