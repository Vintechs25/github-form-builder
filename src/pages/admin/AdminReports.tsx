import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, AlertTriangle,
  Users, Activity, Clock, Plus, FileText, Search, Loader2, ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  description: string | null;
  user_id: string;
  created_at: string;
  due_date: string;
  paid_at: string | null;
  payment_gateway: string | null;
}

interface Subscription {
  id: string;
  domain: string;
  status: string;
  hosting_type: string;
  plan_id: string | null;
  user_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

const AdminReports = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Manual invoice form
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    user_id: "", amount: "", description: "", due_days: "14",
  });
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Credit form
  const [showCredit, setShowCredit] = useState(false);
  const [creditForm, setCreditForm] = useState({ user_id: "", amount: "", reason: "" });
  const [applyingCredit, setApplyingCredit] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: inv }, { data: subs }, { data: prof }, { data: pl }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("hosting_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, email, first_name, last_name"),
      supabase.from("hosting_plans").select("id, name, price_monthly"),
    ]);
    setInvoices(inv || []);
    setSubscriptions(subs || []);
    setProfiles(prof || []);
    setPlans(pl || []);
    setLoading(false);
  };

  const getUser = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || "Unknown" : "Unknown";
  };

  const getUserEmail = (uid: string) => profiles.find(p => p.user_id === uid)?.email || "";

  const getPlan = (pid: string | null) => plans.find(p => p.id === pid)?.name || "No plan";

  // Revenue calculations
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const unpaidInvoices = invoices.filter(i => i.status === "unpaid" || i.status === "overdue");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const pendingRevenue = unpaidInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const overdueRevenue = overdueInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const activeSubs = subscriptions.filter(s => s.status === "active").length;

  // Monthly revenue chart data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthInvoices = paidInvoices.filter(inv => {
      const d = new Date(inv.paid_at || inv.created_at);
      return d >= start && d <= end;
    });
    return {
      month: format(date, "MMM"),
      revenue: monthInvoices.reduce((s, inv) => s + Number(inv.amount), 0),
      count: monthInvoices.length,
    };
  });

  // Create manual invoice
  const createInvoice = async () => {
    if (!invoiceForm.user_id || !invoiceForm.amount) {
      toast.error("User and amount are required");
      return;
    }
    setCreatingInvoice(true);
    const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(invoiceForm.due_days));

    const { error } = await supabase.from("invoices").insert({
      user_id: invoiceForm.user_id,
      invoice_number: invNum,
      amount: Number(invoiceForm.amount),
      description: invoiceForm.description || "Manual invoice",
      due_date: dueDate.toISOString(),
      status: "unpaid",
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success(`Invoice ${invNum} created`);
      setShowInvoice(false);
      setInvoiceForm({ user_id: "", amount: "", description: "", due_days: "14" });
      loadData();
    }
    setCreatingInvoice(false);
  };

  // Apply credit (create a paid credit-note invoice)
  const applyCredit = async () => {
    if (!creditForm.user_id || !creditForm.amount) {
      toast.error("User and amount are required");
      return;
    }
    setApplyingCredit(true);
    const creditNum = `CR-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("invoices").insert({
      user_id: creditForm.user_id,
      invoice_number: creditNum,
      amount: -Number(creditForm.amount),
      description: `Credit: ${creditForm.reason || "Admin credit"}`,
      due_date: new Date().toISOString(),
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_gateway: "admin_credit",
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success(`Credit ${creditNum} applied`);
      setShowCredit(false);
      setCreditForm({ user_id: "", amount: "", reason: "" });
      loadData();
    }
    setApplyingCredit(false);
  };

  const statCards = [
    { label: "Total Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Pending Payments", value: `KES ${pendingRevenue.toLocaleString()}`, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10", sub: `${unpaidInvoices.length} invoices` },
    { label: "Overdue", value: `KES ${overdueRevenue.toLocaleString()}`, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", sub: `${overdueInvoices.length} invoices` },
    { label: "Active Subscriptions", value: activeSubs, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", sub: `of ${subscriptions.length} total` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-semibold text-lg">Revenue Dashboard</h1>
          <p className="text-sm text-muted-foreground">Financial overview, subscriptions & billing controls</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Manual Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Manual Invoice</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">User</Label>
                  <Select value={invoiceForm.user_id} onValueChange={v => setInvoiceForm(p => ({ ...p, user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.first_name} {p.last_name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount (KES)</Label>
                    <Input type="number" value={invoiceForm.amount} onChange={e => setInvoiceForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due in (days)</Label>
                    <Input type="number" value={invoiceForm.due_days} onChange={e => setInvoiceForm(p => ({ ...p, due_days: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={invoiceForm.description} onChange={e => setInvoiceForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <Button onClick={createInvoice} disabled={creatingInvoice} className="w-full">
                  {creatingInvoice ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
                  Create Invoice
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCredit} onOpenChange={setShowCredit}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><DollarSign className="w-3.5 h-3.5 mr-1.5" /> Apply Credit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Apply Credit to User</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">User</Label>
                  <Select value={creditForm.user_id} onValueChange={v => setCreditForm(p => ({ ...p, user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.first_name} {p.last_name} ({p.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Credit Amount (KES)</Label>
                  <Input type="number" value={creditForm.amount} onChange={e => setCreditForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason</Label>
                  <Textarea value={creditForm.reason} onChange={e => setCreditForm(p => ({ ...p, reason: e.target.value }))} rows={2} placeholder="e.g. Goodwill credit, refund, promotion..." />
                </div>
                <Button onClick={applyCredit} disabled={applyingCredit} className="w-full">
                  {applyingCredit ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5 mr-1.5" />}
                  Apply Credit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-xl font-display font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {card.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-semibold text-sm mb-4">Monthly Revenue (Last 6 Months)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
              <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Tabs: Subscriptions | Pending | Overdue */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="subscriptions">Active Subscriptions ({activeSubs})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({unpaidInvoices.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueInvoices.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent Payments</TabsTrigger>
        </TabsList>

        {/* Active Subscriptions */}
        <TabsContent value="subscriptions">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.filter(s => s.status === "active").length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No active subscriptions</TableCell></TableRow>
                ) : subscriptions.filter(s => s.status === "active").map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="text-sm">{getUser(sub.user_id)}</TableCell>
                    <TableCell className="text-sm font-medium">{sub.domain}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {sub.hosting_type === "shared_hosting" ? "Website" : "App"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getPlan(sub.plan_id)}</TableCell>
                    <TableCell><Badge variant="default" className="text-[10px]">Active</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(sub.created_at), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Pending Payments */}
        <TabsContent value="pending">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending payments 🎉</TableCell></TableRow>
                ) : unpaidInvoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{getUser(inv.user_id)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{inv.description || "—"}</TableCell>
                    <TableCell className="font-medium text-sm">KES {Number(inv.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.due_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "overdue" ? "destructive" : "secondary"} className="text-[10px]">{inv.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No overdue invoices 🎉</TableCell></TableRow>
                ) : overdueInvoices.map(inv => {
                  const daysLate = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="text-sm">{getUser(inv.user_id)}</TableCell>
                      <TableCell className="font-medium text-sm text-destructive">KES {Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.due_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-[10px]">{daysLate} days late</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Recent Payments */}
        <TabsContent value="recent">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Paid On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payments yet</TableCell></TableRow>
                ) : paidInvoices.slice(0, 20).map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{getUser(inv.user_id)}</TableCell>
                    <TableCell className="font-medium text-sm">
                      <span className={Number(inv.amount) < 0 ? "text-orange-500" : ""}>
                        KES {Number(inv.amount).toLocaleString()}
                      </span>
                      {Number(inv.amount) < 0 && <Badge variant="outline" className="ml-1.5 text-[10px]">Credit</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.payment_gateway || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{inv.paid_at ? format(new Date(inv.paid_at), "MMM d, yyyy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
