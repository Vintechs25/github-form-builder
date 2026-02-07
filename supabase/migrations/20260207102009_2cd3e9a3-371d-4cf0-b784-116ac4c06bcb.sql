
-- Domain pricing table (WHMCS-style TLD pricing sync)
CREATE TABLE public.domain_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tld TEXT NOT NULL UNIQUE,
  register_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  renew_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  transfer_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  sell_price_register NUMERIC(10,2) GENERATED ALWAYS AS (register_price * (1 + markup_percent / 100)) STORED,
  sell_price_renew NUMERIC(10,2) GENERATED ALWAYS AS (renew_price * (1 + markup_percent / 100)) STORED,
  sell_price_transfer NUMERIC(10,2) GENERATED ALWAYS AS (transfer_price * (1 + markup_percent / 100)) STORED,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domain_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can read enabled TLD prices
CREATE POLICY "Anyone can view enabled domain pricing"
ON public.domain_pricing FOR SELECT
USING (is_enabled = true);

-- Admins can manage pricing
CREATE POLICY "Admins can manage domain pricing"
ON public.domain_pricing FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
CREATE TRIGGER update_domain_pricing_updated_at
BEFORE UPDATE ON public.domain_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
