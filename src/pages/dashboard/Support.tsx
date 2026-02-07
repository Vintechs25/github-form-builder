import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Plus, MessageSquare, Clock, Send } from "lucide-react";
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

interface ContextType { user: User | null; }

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

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-success/10 text-success";
      case "in_progress": return "bg-accent/10 text-accent";
      case "waiting": return "bg-warning/10 text-warning";
      case "resolved": case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "bg-destructive/10 text-destructive";
      case "high": return "bg-warning/10 text-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Support</h1>
          <p className="text-sm text-muted-foreground">Submit and track support tickets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button variant="accent" size="sm"><Plus className="w-4 h-4 mr-1" /> New Ticket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Subject</Label><Input placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
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
                <div>
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
              <div><Label>Message</Label><Textarea placeholder="Describe your issue in detail..." value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)} rows={4} /></div>
              <Button variant="accent" className="w-full" onClick={handleCreate} disabled={creating || !subject.trim() || !initialMessage.trim()}>
                {creating ? "Creating..." : "Submit Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket list */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tickets yet</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => loadMessages(ticket)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedTicket?.id === ticket.id ? "bg-accent/5 border-accent/30" : "bg-card border-border hover:border-accent/20"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm line-clamp-1">{ticket.subject}</h3>
                  <Badge variant="outline" className={`text-[10px] ${statusColor(ticket.status)}`}>{ticket.status.replace("_", " ")}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${priorityColor(ticket.priority)}`}>{ticket.priority}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{ticket.category}</span>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.updated_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Messages panel */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-card rounded-xl border border-border flex flex-col h-[500px]">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={statusColor(selectedTicket.status)}>{selectedTicket.status.replace("_", " ")}</Badge>
                  <Badge variant="outline" className={priorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.is_staff_reply ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.is_staff_reply ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground"
                    }`}>
                      <p>{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.is_staff_reply ? "text-muted-foreground" : "text-accent-foreground/70"}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border flex gap-2">
                <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />
                <Button variant="accent" size="icon" onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 text-center h-[500px] flex flex-col items-center justify-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">Select a ticket</h3>
              <p className="text-muted-foreground">Choose a ticket to view the conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support;
