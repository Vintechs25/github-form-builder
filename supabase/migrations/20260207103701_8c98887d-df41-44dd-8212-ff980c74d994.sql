
-- Add markup_type and markup_fixed columns
ALTER TABLE public.domain_pricing
ADD COLUMN markup_type text NOT NULL DEFAULT 'percent',
ADD COLUMN markup_fixed numeric NOT NULL DEFAULT 0;

-- Drop existing generated columns and recreate with conditional logic
ALTER TABLE public.domain_pricing DROP COLUMN IF EXISTS sell_price_register;
ALTER TABLE public.domain_pricing DROP COLUMN IF EXISTS sell_price_renew;
ALTER TABLE public.domain_pricing DROP COLUMN IF EXISTS sell_price_transfer;

ALTER TABLE public.domain_pricing
ADD COLUMN sell_price_register numeric GENERATED ALWAYS AS (
  CASE WHEN markup_type = 'fixed' THEN register_price + markup_fixed
       ELSE register_price * (1 + markup_percent / 100)
  END
) STORED;

ALTER TABLE public.domain_pricing
ADD COLUMN sell_price_renew numeric GENERATED ALWAYS AS (
  CASE WHEN markup_type = 'fixed' THEN renew_price + markup_fixed
       ELSE renew_price * (1 + markup_percent / 100)
  END
) STORED;

ALTER TABLE public.domain_pricing
ADD COLUMN sell_price_transfer numeric GENERATED ALWAYS AS (
  CASE WHEN markup_type = 'fixed' THEN transfer_price + markup_fixed
       ELSE transfer_price * (1 + markup_percent / 100)
  END
) STORED;
