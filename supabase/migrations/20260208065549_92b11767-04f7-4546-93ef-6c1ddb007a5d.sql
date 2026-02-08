-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete domains
CREATE POLICY "Admins can delete domains"
ON public.domains
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
