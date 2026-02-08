ALTER TABLE hosting_accounts DROP CONSTRAINT hosting_accounts_status_check;
ALTER TABLE hosting_accounts ADD CONSTRAINT hosting_accounts_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'pending_dns'::text, 'active'::text, 'suspended'::text, 'cancelled'::text, 'expired'::text]));