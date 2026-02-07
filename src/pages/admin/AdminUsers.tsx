import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Eye, ShieldCheck, UserCog, Server, Globe, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
}

const ROLES = ["user", "moderator", "admin"] as const;

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // User detail dialog
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [userDomains, setUserDomains] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    const [{ data: profs }, { data: userRoles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles(profs || []);
    const roleMap: Record<string, string> = {};
    userRoles?.forEach(r => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    const currentRole = roles[userId];
    if (currentRole) {
      const { error } = await supabase.from("user_roles")
        .update({ role: newRole as "admin" | "moderator" | "user" })
        .eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles")
        .insert([{ user_id: userId, role: newRole as "admin" | "moderator" | "user" }]);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`Role updated to ${newRole}`);
    load();
  };

  const removeRole = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removed (defaulting to user)");
    load();
  };

  const viewUser = async (profile: Profile) => {
    setSelectedUser(profile);
    setDetailLoading(true);
    const [{ data: svc }, { data: dom }, { data: ord }, { data: inv }] = await Promise.all([
      supabase.from("hosting_accounts").select("*").eq("user_id", profile.user_id),
      supabase.from("domains").select("*").eq("user_id", profile.user_id),
      supabase.from("orders").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("invoices").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(10),
    ]);
    setUserServices(svc || []);
    setUserDomains(dom || []);
    setUserOrders(ord || []);
    setUserInvoices(inv || []);
    setDetailLoading(false);
  };

  const filtered = profiles.filter(p =>
    !search || [p.first_name, p.last_name, p.email].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const roleVariant = (r: string) => {
    if (r === "admin") return "destructive";
    if (r === "moderator") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-lg">Users</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} registered users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>
                  <Badge variant={roleVariant(roles[p.user_id] || "user")}>
                    {roles[p.user_id] || "user"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => viewUser(p)}>
                        <Eye className="w-4 h-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {ROLES.map(r => (
                        <DropdownMenuItem key={r} onClick={() => changeRole(p.user_id, r)}
                          disabled={(roles[p.user_id] || "user") === r}>
                          <UserCog className="w-4 h-4 mr-2" /> Set {r}
                        </DropdownMenuItem>
                      ))}
                      {roles[p.user_id] && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => removeRole(p.user_id)} className="text-destructive">
                            <ShieldCheck className="w-4 h-4 mr-2" /> Remove Role
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={open => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser?.first_name} {selectedUser?.last_name}
              <Badge variant={roleVariant(roles[selectedUser?.user_id || ""] || "user")} className="ml-2">
                {roles[selectedUser?.user_id || ""] || "user"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading user data...</p>
          ) : (
            <div className="space-y-6">
              {/* User info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-secondary rounded-lg p-3">
                  <Server className="w-4 h-4 text-accent mb-1" />
                  <p className="text-lg font-bold">{userServices.length}</p>
                  <p className="text-xs text-muted-foreground">Services</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <Globe className="w-4 h-4 text-accent mb-1" />
                  <p className="text-lg font-bold">{userDomains.length}</p>
                  <p className="text-xs text-muted-foreground">Domains</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <CreditCard className="w-4 h-4 text-accent mb-1" />
                  <p className="text-lg font-bold">{userOrders.length}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <CreditCard className="w-4 h-4 text-accent mb-1" />
                  <p className="text-lg font-bold">{userInvoices.filter(i => i.status === "unpaid").length}</p>
                  <p className="text-xs text-muted-foreground">Unpaid Invoices</p>
                </div>
              </div>

              {/* Services */}
              <div>
                <h3 className="font-display font-semibold text-sm mb-2">Hosting Services</h3>
                {userServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services</p>
                ) : (
                  <div className="space-y-2">
                    {userServices.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                        <div>
                          <p className="font-medium text-sm">{s.domain}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.hosting_type.replace("_", " ")}</p>
                        </div>
                        <Badge variant={s.status === "active" ? "default" : s.status === "suspended" ? "destructive" : "secondary"}>
                          {s.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Domains */}
              <div>
                <h3 className="font-display font-semibold text-sm mb-2">Domains</h3>
                {userDomains.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No domains</p>
                ) : (
                  <div className="space-y-2">
                    {userDomains.map(d => (
                      <div key={d.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                        <div>
                          <p className="font-medium text-sm">{d.domain_name}</p>
                          <p className="text-xs text-muted-foreground">{d.registrar || "No registrar"}</p>
                        </div>
                        <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div>
                <h3 className="font-display font-semibold text-sm mb-2">Recent Orders</h3>
                {userOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders</p>
                ) : (
                  <div className="space-y-2">
                    {userOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                        <div>
                          <p className="font-medium text-sm">{o.domain_name || o.type}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")} · KES {Number(o.total_amount).toLocaleString()}</p>
                        </div>
                        <Badge variant={o.status === "completed" ? "default" : "secondary"}>{o.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
