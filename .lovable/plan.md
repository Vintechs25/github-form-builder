

## Fix Hosting Purchase Flow

### Problem
Currently, clicking "Order Now" creates everything (order, invoice, hosting account) and sends the user to the Websites page without paying. The invoice is left unpaid in Billing. This is not how hosting companies work.

### Correct Flow (Industry Standard)
1. User selects a plan and clicks "Order Now"
2. User is taken to a **checkout page** showing order summary and payment button
3. User pays via Paystack
4. After successful payment, user is redirected to their **Websites page**
5. On the Websites page, they see their new hosting with DNS status:
   - If nameservers are NOT pointed: show instructions to point them
   - If nameservers ARE pointed: hosting is active

### Changes

**1. Create a Checkout page (`src/pages/dashboard/Checkout.tsx`)**
- Receives order details via URL params or route state (plan ID, domain, billing cycle)
- Shows an order summary card: plan name, domain, price, billing cycle
- Has a "Pay Now" button that initializes Paystack payment
- On clicking Pay: creates the order, invoice, and hosting account, then redirects to Paystack
- This ensures nothing is created until the user actually commits to paying

**2. Update `src/pages/dashboard/BuyHosting.tsx`**
- Change "Order Now" button to navigate to the Checkout page instead of creating records directly
- Pass plan ID, domain, and billing cycle as route state
- Remove all the order/invoice/hosting creation logic from this page

**3. Update `src/pages/dashboard/PaymentCallback.tsx`**
- On successful payment, redirect to `/dashboard/websites` instead of billing
- Change the success button text from "View Invoices" to "View My Hosting"
- The process-order or paystack verify function already handles provisioning

**4. Register the new Checkout route in `src/App.tsx`**
- Add `<Route path="checkout" element={<Checkout />} />`

### Technical Details

**Checkout page logic:**
- Reads plan details from route state (`useLocation().state`)
- Fetches the plan from the database to show accurate pricing
- On "Pay Now":
  1. Creates the order (status: pending)
  2. Creates the invoice (status: unpaid)
  3. Creates the hosting account (status: pending_dns)
  4. Calls `paystack/initialize` with the invoice ID
  5. Redirects to Paystack checkout URL
- If no state is passed (direct URL visit), redirects back to buy-hosting

**PaymentCallback changes:**
- Success state shows "Go to My Websites" button linking to `/dashboard/websites`
- The Websites page already handles the DNS check flow with auto-polling

No backend changes needed -- the existing edge functions (paystack, check-dns, process-order) already handle payment verification, DNS checking, and provisioning correctly.
