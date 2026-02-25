
-- Platform settings table for global configuration (key-value store)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings (needed for maintenance mode check)
CREATE POLICY "Authenticated users can read settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('company', '{"name": "VinTech Hosting", "tagline": "Professional Web Hosting", "logo_url": ""}'::jsonb),
  ('maintenance', '{"enabled": false, "message": "We are currently performing scheduled maintenance. Please check back soon."}'::jsonb),
  ('smtp', '{"provider": "resend", "from_name": "VinTech Hosting", "from_email": "noreply@vintechcyber.com"}'::jsonb),
  ('defaults', '{"dns_nameserver_1": "ns1.vintechcyber.com", "dns_nameserver_2": "ns2.vintechcyber.com", "ssl_provider": "letsencrypt", "php_version": "8.2", "deployment_timeout": 300, "default_ram_mb": 512}'::jsonb)
ON CONFLICT (key) DO NOTHING;
