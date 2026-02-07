
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all hosting accounts
CREATE POLICY "Admins can view all hosting"
ON public.hosting_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all domains
CREATE POLICY "Admins can view all domains"
ON public.domains
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all invoices
CREATE POLICY "Admins can view all invoices"
ON public.invoices
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all support tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all ticket messages
CREATE POLICY "Admins can view all ticket messages"
ON public.ticket_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all hosting plans (including inactive)
CREATE POLICY "Admins can view all plans"
ON public.hosting_plans
FOR SELECT
USING (has_role(auth.uid(), 'admin'));
