import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Users, Package, ShoppingBag, CreditCard, Globe, Server,
  HelpCircle, BarChart3, Settings, LogOut, Menu, X, Shield, Loader2, Home, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const adminNav = [
  { icon: Home, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Package, label: "Plans", path: "/admin/plans" },
  { icon: Server, label: "Services", path: "/admin/services" },
  { icon: ShoppingBag, label: "Orders", path: "/admin/orders" },
  { icon: CreditCard, label: "Invoices", path: "/admin/invoices" },
  { icon: Globe, label: "Domains", path: "/admin/domains" },
  { icon: DollarSign, label: "Domain Pricing", path: "/admin/domain-pricing" },
  { icon: HelpCircle, label: "Tickets", path: "/admin/tickets" },
  { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); setLoadingProfile(false); });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out");
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-destructive/80 flex items-center justify-center">
                <Shield className="w-5 h-5 text-destructive-foreground" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-sidebar-foreground">Admin</span>
                <p className="text-[10px] text-sidebar-foreground/50 -mt-1">Control Panel</p>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {adminNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Link to="/dashboard" className="block">
              <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <Server className="w-4 h-4 mr-2" /> Client Panel
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-secondary">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">Admin Mode</span>
              {!loadingProfile && profile && (
                <span className="text-sm text-muted-foreground">{profile.first_name} {profile.last_name}</span>
              )}
            </div>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
