import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Wrench } from "lucide-react";

interface MaintenanceGuardProps {
  children: ReactNode;
}

const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchMaintenance = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "maintenance")
        .maybeSingle();
      
      if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
        setMaintenance(data.value as { enabled: boolean; message: string });
      } else {
        setMaintenance({ enabled: false, message: "" });
      }
      setChecking(false);
    };

    fetchMaintenance();

    const channel = supabase
      .channel("maintenance-mode")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "platform_settings",
          filter: "key=eq.maintenance",
        },
        (payload) => {
          const val = payload.new?.value;
          if (val && typeof val === "object" && !Array.isArray(val)) {
            setMaintenance(val as { enabled: boolean; message: string });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loading = checking || authLoading || (user ? roleLoading : false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Allow auth pages through so admins can log in during maintenance
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  if (maintenance?.enabled && !isAdmin && !isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-foreground">Under Maintenance</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {maintenance.message || "We're currently performing scheduled maintenance. Please check back shortly."}
            </p>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">We apologize for the inconvenience.</p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          >
            Admin access
          </button>
        </div>
      </div>
    );
  }

  // If user just logged in during maintenance and is NOT admin, redirect them away
  if (maintenance?.enabled && user && !isAdmin && isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-foreground">Under Maintenance</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Only administrators can access the platform during maintenance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
