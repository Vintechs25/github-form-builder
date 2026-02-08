

## Suspension Warnings + Email Notifications

### What This Does
1. **Dashboard warnings**: Show a prominent red alert banner on the Overview and Websites pages when a hosting account is suspended, with a direct "Pay Now" link to the overdue invoice.
2. **Email notifications**: Send an email to the user when their hosting is suspended (triggered from the auto-suspend function) and when it's unsuspended (triggered from the Paystack payment flow).

---

### Prerequisites

You'll need to set up a **Resend** account for sending emails:
1. Sign up at [resend.com](https://resend.com)
2. Verify your email domain at [resend.com/domains](https://resend.com/domains)
3. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
4. You'll be prompted to provide the `RESEND_API_KEY` during implementation

---

### Technical Details

**Frontend Changes:**

1. **`src/pages/dashboard/Overview.tsx`** -- Add a suspension alert banner (red/destructive styling) that appears when any hosting account has `status === "suspended"`. It will show the domain name and a "Pay Now" button linking to `/dashboard/billing`.

2. **`src/pages/dashboard/Websites.tsx`** -- Add a suspended state to the website cards: red icon, "Suspended" badge, and an inline warning with a "Pay Overdue Invoice" button linking to billing.

**Backend Changes:**

3. **New edge function: `supabase/functions/send-notification-email/index.ts`** -- A generic notification email sender using Resend. Accepts `to`, `subject`, `html` fields. Used by both auto-suspend and paystack functions.

4. **Update `supabase/functions/auto-suspend/index.ts`** -- After suspending each account, fetch the user's email from `profiles` table and call the `send-notification-email` function to notify them their hosting was suspended with a link to pay.

5. **Update `supabase/functions/paystack/index.ts`** -- After unsuspending an account, send a confirmation email letting the user know their hosting is back online.

6. **Update `supabase/config.toml`** -- Register the new `send-notification-email` function.

