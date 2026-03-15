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
That document is the **single source of truth** for all schemas, event lists,
env vars, and code patterns used here. Do NOT deviate from it.

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

Write the migration SQL using the exact schemas from **monetization.md Section 3**:

- **`plans` table** --- Section 3.1 (include provider ID columns based on selected providers)
- **`subscriptions` table** --- Section 3.2 (with indexes and RLS policies)
- **`user_entitlements` view** --- Section 3.3

Additionally, seed a default `free` plan:
```sql
INSERT INTO public.plans (name, display_name, description, features, price_cents, interval, sort_order)
VALUES ('free', 'Free', 'Basic access', '[]', 0, 'month', 0);
```

---

## Step 3: Edge Functions --- Webhook Handlers

Create Edge Functions for each selected provider. Follow the patterns from
**monetization.md Section 4** exactly --- copy the implementation code from there.

### If stripe or all:

- `supabase/functions/stripe-webhook/index.ts` --- Section 4.1
- `supabase/functions/create-checkout/index.ts` --- Section 6.3 (server-side portion)

### If apple or all:

- `supabase/functions/apple-webhook/index.ts` --- Section 4.2
  - Must handle ALL event types listed in Section 4.2 status map

### If google or all:

- `supabase/functions/google-webhook/index.ts` --- Section 4.3
  - Must handle ALL notification types listed in Section 4.3 status map

### Always:

- `supabase/functions/check-entitlement/index.ts` --- Section 4.4

Ensure `supabase/functions/_shared/` exists. If `edgeConfig.ts` and `edgeResult.ts` don't exist yet, create them per KB Section 19.

---

## Step 4: Client-Side Integration

### React Hook

Create `src/hooks/useSubscription.ts` per **monetization.md Section 6.1**.

### PaywallGate Component

Create `src/components/PaywallGate.tsx` per **monetization.md Section 6.2**.

### Zod Contracts

Create `src/contracts/v1/billing.schema.ts` per **monetization.md Section 3.4**.

### If stripe or all:

Create `src/features/billing/service/checkout.ts` per **monetization.md Section 6.3**.

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
Use the exact variable names from **monetization.md Section 7**.

Do NOT create or modify `.env` --- only `.env.example`.

---

## Step 6: Analytics Events

If an analytics service/emitter exists in the project (check `src/lib/analytics.ts`
or similar), add ALL billing events defined in **monetization.md Section 8**.

If no analytics layer exists yet, skip this step and note it in the summary.

---

## Step 7: Summary

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
