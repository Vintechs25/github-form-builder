

# VINTECH Hosting Platform - Full Build Plan

## Overview

This plan upgrades the existing client panel into a complete hosting automation platform with orders/transactions, RBAC, VPS API integration, NameSilo domain reseller, and enhanced UI across all pages.

---

## Phase 1: Database Schema Updates

### New Tables

- **`orders`** - Track hosting and domain purchases with `user_id`, `type` (hosting/domain), `total_amount`, `status` (pending/paid/cancelled), `package_id`, `domain_name`, `billing_cycle`
- **`transactions`** - Payment records linked to invoices with `invoice_id`, `method`, `reference`, `amount`
- **`dns_records`** - Domain DNS management with `domain_id`, `type` (A/AAAA/CNAME/MX/TXT/NS), `host`, `value`, `ttl`
- **`user_roles`** - RBAC table with `user_id` + `role` enum (`admin`, `moderator`, `user`)

### Schema Modifications

- Add `registrar` column to `domains` table (for NameSilo integration)
- Add `order_id` column to `invoices` table (link invoices to orders)
- Update `hosting_plans` to include `billing_cycle` options

### Security

- RLS on all new tables
- `has_role()` security definer function for admin checks
- Admin-only policies on `user_roles` table

---

## Phase 2: Backend Functions (Edge Functions)

### 1. `vps-api` - VPS Hosting Automation
Proxies requests to `https://panel.vin-tech.top/api/`:
- `POST /create-account` - Provision hosting
- `POST /suspend` - Suspend account
- `POST /delete` - Delete account
- `POST /create-db` - Create database
- `POST /create-email` - Create email account
- `POST /ssl` - Issue SSL certificate

### 2. `namesilo-api` - Domain Reseller
Wraps NameSilo API calls:
- `checkAvailability(domain)` - Search domain availability
- `registerDomain(domain, years)` - Register domain
- `renewDomain(domain)` - Renew domain
- `getDNSRecords(domain)` - List DNS records
- `addDNSRecord(record)` - Add DNS record
- `deleteDNSRecord(id)` - Delete DNS record
- `changeNameservers(domain, ns[])` - Update nameservers

### 3. `process-order` - Order Processing
Handles post-payment automation:
- Creates hosting account via VPS API if hosting order
- Registers domain via NameSilo if domain order
- Updates order/invoice status
- Sends credential emails (future)

---

## Phase 3: Enhanced Client Pages

### New Pages

1. **Buy Hosting** (`/dashboard/buy-hosting`) - Package selection, billing cycle, checkout flow
2. **Search Domains** (`/dashboard/search-domain`) - Domain search with NameSilo availability check, add to cart, register
3. **DNS Manager** (`/dashboard/domains/:id/dns`) - Full DNS record management (A, AAAA, CNAME, MX, TXT, NS records)
4. **Orders** (`/dashboard/orders`) - Order history with status tracking
5. **Cart / Checkout** (`/dashboard/checkout`) - Combined checkout for hosting + domain orders

### Enhanced Existing Pages

- **Websites** - Add "Manage" actions that call VPS API (suspend, SSL, create DB/email)
- **Domains** - Add NameSilo integration (register, renew, transfer, nameserver management)
- **Billing** - Link to orders, show transactions, "Pay Now" flow
- **Overview** - Add revenue/order stats, recent activity feed
- **Settings** - Add password change, notification preferences

---

## Phase 4: Authentication & RBAC

- Add `user_roles` table (separate from profiles, as required)
- Create `has_role()` function for secure role checking
- Add role-aware hook (`useUserRole`) for client-side role checks
- Protect admin-only routes
- Note: Admin dashboard pages are deferred to the next phase per user preference (client panel first)

---

## Technical Details

### Required Secrets
- **VPS_API_KEY** - Authentication token for `panel.vin-tech.top/api/`
- **VPS_API_URL** - Base URL (defaults to `https://panel.vin-tech.top/api/`)
- **NAMESILO_API_KEY** - NameSilo reseller API key

### File Changes Summary

| Category | Files |
|----------|-------|
| Migration | 1 new migration (orders, transactions, dns_records, user_roles, schema updates) |
| Edge Functions | 3 new: `vps-api`, `namesilo-api`, `process-order` |
| New Pages | 5 new dashboard pages |
| Updated Pages | 5 enhanced existing pages |
| Hooks | 1 new: `useUserRole` |
| Services | 2 new: `domainService.ts`, `hostingService.ts` |
| Routes | Updated `App.tsx` with new routes |

### Order of Implementation
1. Database migration (tables + RLS + functions)
2. Edge functions (VPS API proxy, NameSilo wrapper, order processor)
3. Service layer (TypeScript clients for edge functions)
4. New pages (buy hosting, search domain, DNS manager, orders, checkout)
5. Enhance existing pages (websites, domains, billing, overview, settings)
6. RBAC hook and role-based UI guards

