

## Fix: Show All Hosting Accounts on the Websites Page

### Problem
The **Websites** page only fetches hosting accounts with `status = 'active'`. Since your newly purchased hosting is in `pending_dns` status (waiting for nameserver propagation), it doesn't appear at all. The page shows "No active websites yet" even though you just paid for hosting.

### Solution
Update `Websites.tsx` to show **all** hosting accounts (not just active ones), with clear status indicators so you can see exactly what state each site is in and what action is needed.

### What Will Change

**File: `src/pages/dashboard/Websites.tsx`**

1. Remove the `.eq("status", "active")` filter so all hosting accounts are fetched
2. Add status badges to each card (Active, Awaiting DNS, Suspended, Expired, etc.)
3. Show status-appropriate icons (green checkmark for active, clock for pending DNS, warning for suspended)
4. For non-active accounts, show a brief explanation of why it's not live and a link to **My Hosting** for details/actions
5. Update the empty state message since it now means you truly have no hosting at all
6. Keep the "Visit Site" button only for active accounts (since non-active sites aren't live yet)

### Result
- After purchase, your domain immediately appears on the Websites page with an "Awaiting DNS" badge
- You can see at a glance which sites are live and which need attention
- Clicking "Manage" on any site takes you to My Hosting for the full details

### Technical Notes
- Query changes from `.eq("status", "active")` to fetching all statuses
- Status badge styling reuses the same pattern already in `MyHosting.tsx`
- "Visit Site" button conditionally rendered only for `active` accounts
- "Manage" link always points to `/dashboard/hosting`
