import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageSquare, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TICKET_STATUSES = ["open", "in_progress", "closed"];

const AdminTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at");
    setMessages(data || []);
  };

  const updateTicketStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ticket marked as ${status}`);
    if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status });
    load();
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket || !user) return;
    setSending(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: reply.trim(),
      is_staff_reply: true,
    });
    if (error) { toast.error(error.message); setSending(false); return; }
    toast.success("Reply sent");

    // Send ticket reply notification email to the customer
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("user_id", selectedTicket.user_id)
        .maybeSingle();

      if (profile?.email) {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: profile.email,
            type: "ticket_reply",
            data: {
              firstName: profile.first_name,
              ticketSubject: selectedTicket.subject,
              ticketId: selectedTicket.id,
              replyPreview: reply.trim(),
            },
          },
        });
      }
    } catch (emailErr) {
      console.error("Failed to send ticket reply email:", emailErr);
    }

    setReply("");
    setSending(false);
    // Reload messages
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", selectedTicket.id).order("created_at");
    setMessages(data || []);
    // Auto-set to in_progress if open
    if (selectedTicket.status === "open") {
      updateTicketStatus(selectedTicket.id, "in_progress");
    }
  };

  const filtered = tickets.filter(t => !search || t.subject.toLowerCase().includes(search.toLowerCase()));

  const statusVariant = (s: string) => {
    if (s === "open") return "destructive";
    if (s === "closed") return "secondary";
    return "default";
  };

  const priorityVariant = (p: string) => {
    if (p === "high" || p === "urgent") return "destructive";
    if (p === "medium") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg">Support Tickets</h1>
        <p className="text-sm text-muted-foreground">{tickets.length} tickets</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {TICKET_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tickets found</TableCell></TableRow>
            ) : filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.subject}</TableCell>
                <TableCell className="capitalize">{t.category}</TableCell>
                <TableCell><Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge></TableCell>
                <TableCell><Badge variant={statusVariant(t.status)}>{t.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTicket(t)} title="View & Reply">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {t.status !== "closed" ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => updateTicketStatus(t.id, "closed")} title="Close">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => updateTicketStatus(t.id, "open")} title="Reopen">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket?.subject}
              <Badge variant={statusVariant(selectedTicket?.status || "")} className="ml-2">
                {selectedTicket?.status?.replace("_", " ")}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            {TICKET_STATUSES.map(s => (
              <Button key={s} size="sm" variant={selectedTicket?.status === s ? "default" : "outline"}
                onClick={() => updateTicketStatus(selectedTicket?.id, s)} className="capitalize text-xs">
                {s.replace("_", " ")}
              </Button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px]">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet</p>
            ) : messages.map(m => (
              <div key={m.id} className={`p-3 rounded-lg text-sm ${m.is_staff_reply ? "bg-accent/10 border border-accent/20 ml-8" : "bg-secondary mr-8"}`}>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-xs">{m.is_staff_reply ? "Staff" : "Customer"}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), "MMM d, HH:mm")}</span>
                </div>
                <p className="whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea placeholder="Type your reply..." value={reply} onChange={e => setReply(e.target.value)}
              className="flex-1" rows={2} />
            <Button onClick={sendReply} disabled={sending || !reply.trim()} className="self-end">
              {sending ? "Sending..." : "Reply"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTickets;
