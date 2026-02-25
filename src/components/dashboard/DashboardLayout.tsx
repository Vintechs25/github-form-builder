import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Globe, Database, Mail, Shield, Settings, LogOut,
  Menu, X, Home, CreditCard, HelpCircle, Loader2,
  ShoppingBag, Search, BarChart3, Rocket, ChevronDown,
  ChevronRight, ShieldCheck, Package, Eye, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  icon: typeof Home;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "items" in entry;

const navigation: NavEntry[] = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  {
    label: "Services",
    icon: Package,
    items: [
      { icon: Globe, label: "Websites", path: "/dashboard/websites" },
      { icon: Rocket, label: "Applications", path: "/dashboard/applications" },
      { icon: Database, label: "Databases", path: "/dashboard/databases" },
      { icon: Mail, label: "Emails", path: "/dashboard/email" },
    ],
  },
  { icon: Globe, label: "Domains", path: "/dashboard/domains" },
  { icon: BarChart3, label: "Usage & Limits", path: "/dashboard/usage" },
  { icon: Shield, label: "Security", path: "/dashboard/security" },
  { icon: ShoppingBag, label: "Orders", path: "/dashboard/orders" },
  { icon: CreditCard, label: "Billing", path: "/dashboard/billing" },
  { icon: HelpCircle, label: "Support", path: "/dashboard/support" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { impersonatedUser, isImpersonating, stopImpersonation, getEffectiveUserId } = useImpersonation();
  const navigate = useNavigate();
  const location = useLocation();

  // When impersonating, load the impersonated user's profile instead
  const effectiveUserId = getEffectiveUserId(user?.id);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!effectiveUserId) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", effectiveUserId)
        .maybeSingle();
      if (!error && data) setProfile(data);
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [effectiveUserId]);

  // Auto-expand services group if on a services route
  useEffect(() => {
    const servicesPaths = ["/dashboard/websites", "/dashboard/applications", "/dashboard/databases", "/dashboard/email"];
    if (servicesPaths.some((p) => location.pathname.startsWith(p))) {
      setServicesOpen(true);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name)
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name)
      return `${profile.first_name} ${profile.last_name}`;
    return user?.email || "User";
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => (
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
  );

  const renderNavGroup = (group: NavGroup) => {
    const isGroupActive = group.items.some((item) => isActive(item.path));
    return (
      <div key={group.label}>
        <button
          onClick={() => setServicesOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isGroupActive
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`}
        >
          <span className="flex items-center gap-3">
            <group.icon className="w-5 h-5" />
            {group.label}
          </span>
          {servicesOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {servicesOpen && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
            {group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.path)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Rocket className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-sidebar-foreground">
                Vintechs
              </span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navigation.map((entry) =>
              isGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry)
            )}
          </nav>

          {isAdmin && (
            <div className="px-3 pb-2">
              <Link to="/admin" onClick={() => setSidebarOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground bg-destructive/10 hover:bg-destructive/20">
                  <ShieldCheck className="w-4 h-4 mr-2 text-destructive" /> Admin Panel
                </Button>
              </Link>
            </div>
          )}

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                {loadingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin text-sidebar-foreground" />
                ) : (
                  <span className="text-sm font-semibold text-sidebar-foreground">{getInitials()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {loadingProfile ? "Loading..." : getDisplayName()}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ""}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
          {isImpersonating && impersonatedUser && (
            <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  Viewing as: {impersonatedUser.first_name} {impersonatedUser.last_name} ({impersonatedUser.email})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { stopImpersonation(); navigate("/admin/users"); }}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Exit Impersonation
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-secondary">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          <Outlet context={{ profile, user: isImpersonating ? { ...user, id: impersonatedUser?.user_id } : user }} />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
