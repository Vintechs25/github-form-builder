-- Allow admins to delete invoices
CREATE POLICY "Admins can delete invoices"
ON public.invoices
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete hosting accounts (already exists but adding invoices delete)
-- hosting_accounts already has "Admins can delete hosting" policy, so no change needed there
