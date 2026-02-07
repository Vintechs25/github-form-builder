
-- Admins can update all hosting accounts (suspend/unsuspend/delete)
CREATE POLICY "Admins can update all hosting"
ON public.hosting_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete hosting accounts
CREATE POLICY "Admins can delete hosting"
ON public.hosting_accounts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all invoices
CREATE POLICY "Admins can update all invoices"
ON public.invoices
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can reply to any ticket
CREATE POLICY "Admins can create ticket messages"
ON public.ticket_messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can manage plans (insert/update)
CREATE POLICY "Admins can insert plans"
ON public.hosting_plans
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
ON public.hosting_plans
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can create invoices
CREATE POLICY "Admins can create invoices"
ON public.invoices
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));
