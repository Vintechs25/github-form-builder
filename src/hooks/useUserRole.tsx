import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AppRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setRole(data.role as AppRole);
      } else {
        setRole("user");
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isModerator = role === "moderator" || role === "admin";

  return { role, isAdmin, isModerator, loading };
};
