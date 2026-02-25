import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Wrench } from "lucide-react";

interface MaintenanceGuardProps {
  children: ReactNode;
}

const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
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
  }, []);

  const loading = checking || authLoading || (user ? roleLoading : false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (maintenance?.enabled && !isAdmin) {
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
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
