import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle, Plus, MessageSquare, Clock, Send, Search,
  BookOpen, LifeBuoy, Zap, Shield, Globe, CreditCard,
  ChevronDown, ChevronRight, ArrowLeft, Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContextType { user: User | null; }

const kbArticles = [
  { icon: Zap, title: "Getting Started", desc: "Set up your first website in minutes", category: "general" },
  { icon: Globe, title: "Domain Management", desc: "Connect, transfer, and manage domains", category: "domain" },
  { icon: Shield, title: "SSL & Security", desc: "Enable SSL and secure your site", category: "technical" },
  { icon: CreditCard, title: "Billing & Payments", desc: "Manage invoices, plans, and payments", category: "billing" },
  { icon: BookOpen, title: "DNS Configuration", desc: "Set up A, CNAME, MX, and TXT records", category: "domain" },
  { icon: LifeBuoy, title: "Troubleshooting", desc: "Common issues and how to fix them", category: "technical" },
];

const faqItems = [
  { q: "How do I connect my domain?", a: "Go to Domains → Add Domain, then update your nameservers or add the required DNS records at your registrar." },
  { q: "How do I enable SSL?", a: "SSL is automatically provisioned for all hosted domains. Check the Security page to verify your certificate status." },
  { q: "Can I upgrade my plan?", a: "Yes! Go to Billing → Change Plan. Upgrades are prorated and take effect immediately." },
  { q: "How do I set up email?", a: "Navigate to Email Accounts, click Create Account, and follow the setup wizard to configure your mailbox." },
  { q: "What payment methods are accepted?", a: "We accept M-Pesa, bank transfers, and card payments through our secure payment gateway." },
  { q: "How long does domain registration take?", a: "Most domains are registered instantly. Some TLDs may take up to 24 hours for propagation." },
];

const Support = () => {
  const { user } = useOutletContext<ContextType>();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [initialMessage, setInitialMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const loadMessages = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const handleCreate = async () => {
    if (!user || !subject.trim() || !initialMessage.trim()) return;
    setCreating(true);
    const { data: ticket, error } = await supabase.from("support_tickets").insert({
      user_id: user.id, subject: subject.trim(), category, priority, status: "open",
    }).select().single();

    if (error || !ticket) { toast.error("Failed to create ticket"); setCreating(false); return; }

    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id, user_id: user.id, message: initialMessage.trim(),
    });

    toast.success("Ticket created!");
    setSubject(""); setInitialMessage(""); setDialogOpen(false);
    fetchTickets();
    setCreating(false);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id, user_id: user.id, message: newMessage.trim(),
    });
    if (error) { toast.error("Failed to send message"); }
    else { setNewMessage(""); loadMessages(selectedTicket); }
    setSendingMessage(false);
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-success/10 text-success border-success/20" },
    in_progress: { label: "In Progress", className: "bg-accent/10 text-accent border-accent/20" },
    waiting: { label: "Awaiting Reply", className: "bg-warning/10 text-warning border-warning/20" },
    resolved: { label: "Resolved", className: "bg-muted text-muted-foreground border-border" },
    closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
  };

  const priorityConfig: Record<string, { label: string; className: string }> = {
    urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
    high: { label: "High", className: "bg-warning/10 text-warning border-warning/20" },
    medium: { label: "Medium", className: "bg-muted text-muted-foreground border-border" },
    low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  };

  const filteredFaq = searchQuery
    ? faqItems.filter(f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqItems;

  const openCount = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Help & Support</h1>
          <p className="text-sm text-muted-foreground">Find answers or reach our team</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-accent" />
                Create Support Ticket
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="hosting">Hosting</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea placeholder="Describe your issue in detail..." value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} rows={4} />
              </div>
              <Button variant="accent" className="w-full" onClick={handleCreate} disabled={creating || !subject.trim() || !initialMessage.trim()}>
                {creating ? "Creating..." : "Submit Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tickets", value: tickets.length, icon: MessageSquare },
          { label: "Open", value: openCount, icon: HelpCircle },
          { label: "Resolved", value: tickets.filter(t => t.status === "resolved" || t.status === "closed").length, icon: Shield },
          { label: "Avg Response", value: "< 2h", icon: Clock },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-display">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Tickets
            {openCount > 0 && <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20">{openCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="kb" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Knowledge Base</TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> FAQ</TabsTrigger>
        </TabsList>

        {/* TICKETS TAB */}
        <TabsContent value="tickets" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ticket list */}
            <div className={`lg:col-span-1 space-y-2 ${selectedTicket ? "hidden lg:block" : ""}`}>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="bg-card rounded-xl border border-border p-4 h-20 animate-pulse" />)}
                </div>
              ) : tickets.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl border border-border p-10 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Headphones className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold mb-1">No tickets yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first ticket to get help from our team.</p>
                  <Button variant="accent" size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> New Ticket
                  </Button>
                </motion.div>
              ) : (
                tickets.map((ticket, i) => (
                  <motion.button
                    key={ticket.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => loadMessages(ticket)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                      selectedTicket?.id === ticket.id
                        ? "bg-accent/5 border-accent/30 shadow-sm"
                        : "bg-card border-border hover:border-accent/20 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-1 group-hover:text-accent transition-colors">{ticket.subject}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2 group-hover:text-accent transition-colors" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${statusConfig[ticket.status]?.className || "bg-muted text-muted-foreground"}`}>
                        {statusConfig[ticket.status]?.label || ticket.status}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${priorityConfig[ticket.priority]?.className || ""}`}>
                        {ticket.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Messages panel */}
            <div className={`lg:col-span-2 ${!selectedTicket ? "hidden lg:block" : ""}`}>
              {selectedTicket ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border flex flex-col h-[520px]"
                >
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="lg:hidden shrink-0 h-8 w-8" onClick={() => setSelectedTicket(null)}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{selectedTicket.subject}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={`text-[10px] ${statusConfig[selectedTicket.status]?.className || ""}`}>
                          {statusConfig[selectedTicket.status]?.label || selectedTicket.status}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${priorityConfig[selectedTicket.priority]?.className || ""}`}>
                          {selectedTicket.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">{selectedTicket.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <AnimatePresence>
                      {messages.map((msg, i) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`flex ${msg.is_staff_reply ? "justify-start" : "justify-end"}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                            msg.is_staff_reply
                              ? "bg-secondary text-secondary-foreground rounded-bl-md"
                              : "bg-primary text-primary-foreground rounded-br-md"
                          }`}>
                            {msg.is_staff_reply && (
                              <p className="text-[10px] font-medium text-accent mb-1">Support Team</p>
                            )}
                            <p className="leading-relaxed">{msg.message}</p>
                            <p className={`text-[10px] mt-1.5 ${msg.is_staff_reply ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="p-3 border-t border-border flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      className="text-sm"
                    />
                    <Button variant="accent" size="icon" onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()} className="shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-card rounded-xl border border-border p-12 text-center h-[520px] flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold mb-1">Select a Ticket</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">Choose a ticket from the list to view the conversation, or create a new one.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* KNOWLEDGE BASE TAB */}
        <TabsContent value="kb">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kbArticles.map((article, i) => (
              <motion.div
                key={article.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 hover:border-accent/20 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                  <article.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-sm mb-1 group-hover:text-accent transition-colors">{article.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{article.desc}</p>
                <Badge variant="outline" className="mt-3 text-[10px] capitalize">{article.category}</Badge>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* FAQ TAB */}
        <TabsContent value="faq" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            {filteredFaq.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {expandedFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {filteredFaq.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No matching questions found.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Support;
