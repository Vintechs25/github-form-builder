import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Search, MoreVertical, Eye, ShieldCheck, UserCog, Server, Globe, CreditCard, Package, BarChart3, Pause, Play, LogIn } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string; user_id: string; first_name: string | null; last_name: string | null;
  email: string | null; created_at: string; plan_id: string | null; account_status: string;
}

const ROLES = ["user", "moderator", "admin"] as const;

const AdminUsers = () => {
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [userDomains, setUserDomains] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planDialogUser, setPlanDialogUser] = useState<Profile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const load = async () => {
    const [{ data: profs }, { data: userRoles }, { data: plansData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("hosting_plans").select("*").eq("is_active", true).order("price_monthly"),
    ]);
    setProfiles((profs as any) || []);
    setPlans(plansData || []);
    const roleMap: Record<string, string> = {};
    userRoles?.forEach(r => { roleMap[r.user_id] = r.role; });
    setRoles(roleMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    const currentRole = roles[userId];
    if (currentRole) {
      const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles").insert([{ user_id: userId, role: newRole }]);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`Role updated to ${newRole}`);
    load();
  };

  const removeRole = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role removed");
    load();
  };

  const toggleUserStatus = async (profile: Profile) => {
    const newStatus = profile.account_status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("profiles").update({ account_status: newStatus }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`User ${newStatus === "active" ? "reactivated" : "suspended"}`);
    load();
  };

  const openAssignPlan = (profile: Profile) => {
    setPlanDialogUser(profile);
    setSelectedPlanId(profile.plan_id || "");
    setPlanDialogOpen(true);
  };

  const savePlanAssignment = async () => {
    if (!planDialogUser) return;
    const { error } = await supabase.from("profiles")
      .update({ plan_id: selectedPlanId || null })
      .eq("id", planDialogUser.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan assigned");
    setPlanDialogOpen(false);
    load();
  };

  const viewUser = async (profile: Profile) => {
    setSelectedUser(profile);
    setDetailLoading(true);
    const [{ data: svc }, { data: dom }, { data: ord }, { data: inv }] = await Promise.all([
      supabase.from("hosting_accounts").select("*, hosting_plans(name)").eq("user_id", profile.user_id),
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
    if (r === "admin") return "destructive" as const;
    if (r === "moderator") return "default" as const;
    return "secondary" as const;
  };

  const getPlanName = (planId: string | null) => {
    if (!planId) return "No Plan";
    return plans.find(p => p.id === planId)?.name || "Unknown";
  };

  const formatMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

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
              <TableHead>Plan</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{getPlanName(p.plan_id)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariant(roles[p.user_id] || "user")}>{roles[p.user_id] || "user"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={p.account_status === "active" ? "default" : "destructive"}>
                    {p.account_status || "active"}
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
                      <DropdownMenuItem onClick={() => {
                        startImpersonation({
                          user_id: p.user_id,
                          first_name: p.first_name,
                          last_name: p.last_name,
                          email: p.email,
                        });
                        navigate("/dashboard");
                      }}>
                        <LogIn className="w-4 h-4 mr-2 text-orange-500" /> Login as User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAssignPlan(p)}>
                        <Package className="w-4 h-4 mr-2" /> Assign Plan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {ROLES.map(r => (
                        <DropdownMenuItem key={r} onClick={() => changeRole(p.user_id, r)}
                          disabled={(roles[p.user_id] || "user") === r}>
                          <UserCog className="w-4 h-4 mr-2" /> Set {r}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toggleUserStatus(p)}>
                        {p.account_status === "active" ? (
                          <><Pause className="w-4 h-4 mr-2" /> Suspend User</>
                        ) : (
                          <><Play className="w-4 h-4 mr-2" /> Reactivate User</>
                        )}
                      </DropdownMenuItem>
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

      {/* Assign Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Plan — {planDialogUser?.first_name} {planDialogUser?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Plan</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.plan_type}) — KES {Number(p.price_monthly).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlanId && selectedPlanId !== "none" && (() => {
              const plan = plans.find(p => p.id === selectedPlanId);
              if (!plan) return null;
              return (
                <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Type:</span> {plan.plan_type}</p>
                  <p><span className="text-muted-foreground">Websites:</span> {plan.max_domains}</p>
                  <p><span className="text-muted-foreground">Apps:</span> {plan.max_apps}</p>
                  <p><span className="text-muted-foreground">Storage:</span> {formatMb(plan.storage_mb)}</p>
                  <p><span className="text-muted-foreground">RAM:</span> {plan.ram_mb > 0 ? `${plan.ram_mb} MB` : "—"}</p>
                  <p><span className="text-muted-foreground">Emails:</span> {plan.max_email_accounts}</p>
                  <p><span className="text-muted-foreground">DBs:</span> {plan.max_databases}</p>
                </div>
              );
            })()}
            <Button onClick={savePlanAssignment} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={open => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser?.first_name} {selectedUser?.last_name}
              <Badge variant={roleVariant(roles[selectedUser?.user_id || ""] || "user")} className="ml-2">
                {roles[selectedUser?.user_id || ""] || "user"}
              </Badge>
              <Badge variant={selectedUser?.account_status === "active" ? "default" : "destructive"} className="ml-1">
                {selectedUser?.account_status || "active"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading user data...</p>
          ) : (
            <div className="space-y-6">
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
                  <BarChart3 className="w-4 h-4 text-accent mb-1" />
                  <p className="text-lg font-bold">{userInvoices.filter(i => i.status === "unpaid").length}</p>
                  <p className="text-xs text-muted-foreground">Unpaid Invoices</p>
                </div>
              </div>

              {/* Usage per service */}
              {userServices.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Usage Overview</h3>
                  <div className="space-y-3">
                    {userServices.map(s => (
                      <div key={s.id} className="bg-secondary rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{s.domain}</p>
                          <Badge variant={s.status === "active" ? "default" : s.status === "suspended" ? "destructive" : "secondary"}>{s.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Storage: {s.storage_used_mb} MB · Type: {s.hosting_type?.replace("_", " ")} · Plan: {(s.hosting_plans as any)?.name || "None"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-display font-semibold text-sm mb-2">Domains</h3>
                {userDomains.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No domains</p>
                ) : (
                  <div className="space-y-2">
                    {userDomains.map(d => (
                      <div key={d.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                        <p className="font-medium text-sm">{d.domain_name}</p>
                        <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
