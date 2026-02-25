import { supabase } from "@/integrations/supabase/client";

export const logAudit = async (
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert([{
    admin_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId || null,
    details: (details || {}) as any,
  }]);
};
