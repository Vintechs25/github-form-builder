
-- Central API configuration table
CREATE TABLE public.api_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_enabled boolean NOT NULL DEFAULT true,
  base_url text,
  health_check_url text,
  last_health_check timestamp with time zone,
  health_status text DEFAULT 'unknown',
  rate_limit_per_minute integer DEFAULT 60,
  timeout_seconds integer DEFAULT 30,
  retry_count integer DEFAULT 3,
  config jsonb DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API configs"
  ON public.api_configurations FOR ALL
  USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can view API configs"
  ON public.api_configurations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::text));

-- Seed with existing APIs
INSERT INTO public.api_configurations (api_name, display_name, description, category, is_enabled) VALUES
  ('coolify-api', 'Application Engine', 'Manages application deployments, builds, and runtime', 'deployment', true),
  ('vps-api', 'Server Management', 'VPS and shared hosting server operations', 'infrastructure', true),
  ('namesilo-api', 'Domain Registrar', 'Domain registration, renewal, and DNS management', 'domains', true),
  ('paystack', 'Payment Gateway', 'Payment processing and transaction management', 'billing', true),
  ('process-order', 'Order Processor', 'Handles order creation and fulfillment workflow', 'billing', true),
  ('check-dns', 'DNS Checker', 'Validates DNS propagation and configuration', 'domains', true),
  ('auto-suspend', 'Auto Suspend', 'Automatically suspends overdue or expired accounts', 'automation', true),
  ('send-notification-email', 'Email Notifications', 'Sends transactional and notification emails', 'notifications', true),
  ('check-expiring', 'Expiry Monitor', 'Monitors and alerts on expiring services and domains', 'automation', true),
  ('admin-actions', 'Admin Actions', 'Administrative user and account management operations', 'admin', true);

-- API activity logs
CREATE TABLE public.api_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_name text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API logs"
  ON public.api_activity_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::text));
