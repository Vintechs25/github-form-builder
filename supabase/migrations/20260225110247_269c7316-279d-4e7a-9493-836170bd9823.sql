
-- Add new columns to hosting_plans for hybrid plan support
ALTER TABLE public.hosting_plans 
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS max_apps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ram_mb integer NOT NULL DEFAULT 0;

-- Rename max_domains to max_websites for clarity (keep max_domains as alias)
-- We'll use max_domains as max_websites since it maps to website count
-- Add backend_id to hosting_accounts for engine routing
ALTER TABLE public.hosting_accounts
  ADD COLUMN IF NOT EXISTS backend_id text DEFAULT NULL;

-- Add plan_id and account status to profiles for user-level plan assignment
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.hosting_plans(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';
