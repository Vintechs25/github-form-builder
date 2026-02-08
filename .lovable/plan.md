

## Restructure: Websites (Domains) vs My Hosting (Services)

### Concept

Following how Hostinger, Namecheap, and SiteGround work:

- **Websites** = Domains migrated/pointed to your nameservers. These are the sites you manage on the platform. Think of it as "My Sites" -- domains that resolve to us.
- **My Hosting** = Your hosting service plans. Each one links to a domain. This is where CyberPanel-like management lives: File Manager, SSL, WordPress admin, databases -- but **gated by what the paid plan includes**.

### Navigation (sidebar update)

```text
Overview
Websites          --> Domains pointed to us (active sites)
My Hosting        --> All hosting accounts with plan-based management tools
Buy Hosting
Domains
Search Domains
...rest stays the same
```

### Changes

**1. Refactor `Websites.tsx` -- Show domains pointed to us**
- Fetch `hosting_accounts` where `status = 'active'` (DNS verified, hosted on our platform)
- Each card shows: domain name, status badge ("Active"), quick links (visit site, view DNS)
- Remove all DNS polling, nameserver banners, pending/suspended logic
- Empty state: "No active websites yet. Check My Hosting for pending services."
- This page is purely about your live sites on the platform

**2. Create `MyHosting.tsx` -- Hosting service lifecycle + CyberPanel tools**
- Fetch all `hosting_accounts` joined with `hosting_plans` for plan details
- Each hosting card shows:
  - Domain, plan name, status, expiry date
  - Status-specific actions (same as discussed before: Pay Now / Point DNS / Manage / Renew)
  - For **active** accounts: a "Manage" button that expands or links to management tools
- **Plan-gated management tools** for active accounts:
  - File Manager -- always shown (core feature)
  - SSL/Security -- always shown
  - WordPress Admin -- only if `plan.wordpress_enabled === true`
  - Email Accounts -- shown with count from `plan.max_email_accounts`
  - Databases -- shown with count from `plan.max_databases`
  - Storage/Bandwidth usage bars using plan limits as the max
- DNS check polling for `pending_dns` accounts (moved here from Websites)
- Nameserver instructions banner (moved here)

**3. Update `DashboardLayout.tsx` sidebar**
- Add "My Hosting" nav item (Server icon) between Websites and Buy Hosting
- Keep Websites with Globe icon

**4. Update `App.tsx` routing**
- Add route: `hosting` -> `MyHosting`

**5. Update `Overview.tsx`**
- "Your Websites" section renamed to "Your Hosting"  
- "View All" links to `/dashboard/hosting`
- Pending DNS alert links to `/dashboard/hosting` instead of `/dashboard/websites`
- Stat card "Active Websites" stays, but "Awaiting DNS" card links to hosting page

### My Hosting -- Management Panel Detail

When a hosting account is **active**, the card includes a management section with tools shown based on the plan:

| Tool | Condition | Action |
|------|-----------|--------|
| File Manager | Always | Opens File Manager page (filtered to this account) |
| SSL Certificate | Always | Shows SSL status, toggle, or link to Security page |
| WordPress | `plan.wordpress_enabled` | Link to WP admin URL or setup |
| Email Accounts | `plan.max_email_accounts > 0` | Link to Email page, shows X/Y used |
| Databases | `plan.max_databases > 0` | Link to Databases page, shows X/Y used |
| Storage | Always | Progress bar: used / plan.storage_mb |
| Bandwidth | Always | Progress bar: used / plan.bandwidth_mb |

### Technical Details

- `MyHosting.tsx` query: `hosting_accounts` with `select("*, hosting_plans(*)")` to get plan details in one call
- Plan features gating uses the joined `hosting_plans` data (no extra queries)
- Storage/bandwidth bars use `plan.storage_mb` and `plan.bandwidth_mb` as max values (not hardcoded 5GB/50GB)
- The `Websites.tsx` becomes much simpler -- just active accounts with visit/manage links
- No database changes needed -- all data already exists in `hosting_accounts` and `hosting_plans`

### Files to Change
- `src/pages/dashboard/MyHosting.tsx` -- **new file**
- `src/pages/dashboard/Websites.tsx` -- simplify to active-only sites
- `src/components/dashboard/DashboardLayout.tsx` -- add "My Hosting" nav item
- `src/App.tsx` -- add hosting route
- `src/pages/dashboard/Overview.tsx` -- update links and labels

