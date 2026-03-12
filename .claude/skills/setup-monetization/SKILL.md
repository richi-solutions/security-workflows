---
name: setup-monetization
description: Sets up cross-platform monetization with Stripe (Web) and optional App Store / Google Play (Mobile). Creates database schema, Edge Functions, webhook handlers, and client-side hooks. Use /setup-monetization [stripe|apple|google|all] to invoke.
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
argument-hint: "[stripe|apple|google|all]"
---

# Setup Monetization

Configure cross-platform monetization for this project.

**Architecture reference:** Always load `.claude/ref/generation/monetization.md` first.
That document is the authoritative source for all patterns used here.

Providers to set up: `$ARGUMENTS` (default: `stripe` if empty)
Project structure: !`ls src/ 2>/dev/null || echo "no src/ directory"`
Existing Supabase: !`ls supabase/migrations/ 2>/dev/null || echo "no migrations"`
Package manager: !`[ -f bun.lockb ] && echo "bun" || ([ -f pnpm-lock.yaml ] && echo "pnpm" || ([ -f yarn.lock ] && echo "yarn" || echo "npm"))`
Existing billing: !`grep -rl "stripe\|subscription\|billing" src/ 2>/dev/null | head -5 || echo "none"`
Edge functions: !`ls supabase/functions/ 2>/dev/null || echo "no edge functions"`

---

## Step 1: Validate Environment

1. Confirm this is a Consumer-Pro project (check for `src/`, `supabase/`, `.claude/`)
2. Confirm Supabase is initialized (`supabase/config.toml` exists)
3. Parse `$ARGUMENTS` to determine which providers to set up:
   - `stripe` --- Stripe only (Web)
   - `apple` --- Apple App Store only (iOS)
   - `google` --- Google Play only (Android)
   - `all` --- All three providers
   - Empty/missing --- Default to `stripe`
4. Check if billing tables already exist in migrations. If yes, warn and ask before overwriting.

---

## Step 2: Database Migration

Create a new Supabase migration with the billing schema.

Run:
```bash
npx supabase migration new add_billing_tables
```

Write the migration SQL based on `monetization.md` Section 3:

### Tables to create:

**`plans`** --- Available subscription tiers
- id, name, display_name, description, features (JSONB)
- stripe_price_id (if stripe/all), apple_product_id (if apple/all), google_product_id (if google/all)
- price_cents, currency, interval, sort_order, is_active, timestamps
- RLS: Public readable

**`subscriptions`** --- Active user subscriptions
- id, user_id (FK auth.users), plan_id (FK plans)
- provider, provider_subscription_id, provider_customer_id
- status (active/trialing/past_due/canceled/expired/paused)
- current_period_start, current_period_end, cancel_at_period_end, canceled_at, timestamps
- UNIQUE on (provider, provider_subscription_id)
- RLS: Users can view own, service_role manages all

**`user_entitlements`** --- View (not table)
- Joins subscriptions + plans for easy entitlement lookups

### Seed data:

Insert a default `free` plan:
```sql
INSERT INTO public.plans (name, display_name, description, features, price_cents, interval, sort_order)
VALUES ('free', 'Free', 'Basic access', '[]', 0, 'month', 0);
```

---

## Step 3: Edge Functions --- Webhook Handlers

Create Edge Functions for each selected provider. Follow the patterns from
`monetization.md` Section 4 exactly.

### If stripe or all:

Create `supabase/functions/stripe-webhook/index.ts`:
- Verify Stripe signature
- Handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- Upsert into subscriptions table

Create `supabase/functions/create-checkout/index.ts`:
- Requires authenticated user (JWT)
- Creates a Stripe Checkout Session with `metadata.user_id`
- Returns checkout URL
- Include success_url and cancel_url

### If apple or all:

Create `supabase/functions/apple-webhook/index.ts`:
- Decode JWS signedPayload
- Handle: SUBSCRIBED, DID_RENEW, EXPIRED, DID_CHANGE_RENEWAL_STATUS, DID_FAIL_TO_RENEW, REFUND
- Upsert into subscriptions table
- User linking via appAccountToken

### If google or all:

Create `supabase/functions/google-webhook/index.ts`:
- Decode Pub/Sub message
- Verify with Google Play Developer API
- Handle notification types 1-13
- Upsert into subscriptions table
- User linking via obfuscatedExternalAccountId

### Always:

Create `supabase/functions/check-entitlement/index.ts`:
- Requires authenticated user (JWT)
- Returns current plan, features, status, expiresAt
- Falls back to free tier if no active subscription
- Error envelope format

Ensure `supabase/functions/_shared/` exists. If `edgeConfig.ts` and `edgeResult.ts` don't exist yet, create them per KB Section 19.

---

## Step 4: Client-Side Integration

### React Hook

Create `src/hooks/useSubscription.ts`:
- Uses TanStack Query to call check-entitlement
- Returns: entitlement, hasFeature(), isPro, isLoading
- 5-minute stale time, refetch on window focus
- See monetization.md Section 6.1

### PaywallGate Component

Create `src/components/PaywallGate.tsx`:
- Props: feature (string), children, fallback (optional)
- Shows children if feature is available
- Shows upgrade prompt or custom fallback otherwise
- See monetization.md Section 6.2

### If stripe or all:

Create `src/features/billing/service/checkout.ts`:
- `createCheckoutSession(priceId)` --- calls create-checkout Edge Function
- `redirectToCustomerPortal()` --- calls Stripe Customer Portal Edge Function

Create `src/features/billing/ui/PricingPage.tsx`:
- Scaffold only (basic structure, not full implementation)
- Shows plans from Supabase
- Checkout button per plan
- Current plan indicator

Install Stripe client library:
```bash
npm install @stripe/stripe-js
```

---

## Step 5: Environment Variables

Update `.env.example` with all required variables for the selected providers.

### Always:
```
# Already present (Supabase)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### If stripe or all:
```
# Stripe (Edge Functions)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe (Client)
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

### If apple or all:
```
# Apple (Edge Functions)
APPLE_SHARED_SECRET=
APPLE_BUNDLE_ID=
```

### If google or all:
```
# Google Play (Edge Functions)
GOOGLE_PACKAGE_NAME=
GOOGLE_SERVICE_ACCOUNT_KEY=
```

Do NOT create or modify `.env` --- only `.env.example`.

---

## Step 6: Analytics Events

If an analytics service/emitter exists in the project (check `src/lib/analytics.ts`
or similar), add the billing events defined in `monetization.md` Section 8:

- subscription_started, subscription_renewed, subscription_canceled, subscription_expired
- paywall_shown, paywall_converted
- checkout_started, checkout_completed, checkout_abandoned

If no analytics layer exists yet, skip this step and note it in the summary.

---

## Step 7: Contracts

Create Zod schemas for billing contracts:

Create `src/contracts/v1/billing.schema.ts`:
```typescript
import { z } from "zod";

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string(),
  features: z.array(z.string()),
  priceCents: z.number().int().min(0),
  currency: z.string(),
  interval: z.enum(["month", "year", "lifetime"]),
});

export const EntitlementSchema = z.object({
  plan: z.string(),
  features: z.array(z.string()),
  status: z.enum(["active", "trialing", "past_due", "canceled", "expired", "none"]),
  expiresAt: z.string().datetime().nullable(),
  willCancel: z.boolean(),
});

export const CheckoutInputSchema = z.object({
  priceId: z.string().min(1),
});

export type Plan = z.infer<typeof PlanSchema>;
export type Entitlement = z.infer<typeof EntitlementSchema>;
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;
```

---

## Step 8: Summary

Output:

```
## Monetization Setup Complete

### Providers Configured
- [x] Stripe (Web) / [ ] Apple (iOS) / [ ] Google (Android)

### Files Created
- supabase/migrations/XXXXXXXXX_add_billing_tables.sql
- supabase/functions/stripe-webhook/index.ts (if applicable)
- supabase/functions/apple-webhook/index.ts (if applicable)
- supabase/functions/google-webhook/index.ts (if applicable)
- supabase/functions/check-entitlement/index.ts
- supabase/functions/create-checkout/index.ts (if Stripe)
- src/hooks/useSubscription.ts
- src/components/PaywallGate.tsx
- src/features/billing/service/checkout.ts (if Stripe)
- src/features/billing/ui/PricingPage.tsx (if Stripe)
- src/contracts/v1/billing.schema.ts
- .env.example (updated)

### Next Steps
1. [ ] Apply migration: `supabase db push` (or `supabase db reset` locally)
2. [ ] Configure Stripe Dashboard (Products, Prices, Webhook, Customer Portal)
3. [ ] Set environment variables in Supabase Edge Function secrets
4. [ ] Set environment variables in Vercel Dashboard
5. [ ] Test webhook locally: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
6. [ ] Insert plan rows into `plans` table (match Stripe Price IDs)
7. [ ] Add /pricing route to React Router
8. [ ] Run /test-gen billing to generate tests
9. [ ] (If Apple) Configure App Store Connect subscriptions + server notifications
10. [ ] (If Google) Configure Play Console subscriptions + RTDN
```
