# Monetization Architecture Contract

**Version:** 1.0
**Status:** ACTIVE
**Authority:** CONSUMER-PRO GENERATION CONTRACT
**Depends on:** `rules/core/consumer-pro-kb.md` (ROOT AUTHORITY)

---

## 1 --- Purpose

Defines the architecture for cross-platform monetization using
**Supabase as Single Source of Truth** (SSOT). Supports Stripe (Web),
Apple App Store, and Google Play as payment providers --- all syncing
into one unified subscription model.

**Design principle:** Build once in the orchestrator, distribute to all projects.
No vendor middleware (RevenueCat) --- full control, zero revenue share.

---

## 2 --- Architecture Overview

```
+-------------------------------------------------------------+
|                    Supabase (SSOT)                           |
|  +--------+  +--------------+  +-------------+  +--------+  |
|  | plans  |  | subscriptions|  | entitlements |  |  auth  |  |
|  +--------+  +--------------+  +-------------+  +--------+  |
+-----+----------------+----------------+-------------+--------+
      |                |                |             |
      v                v                v             v
+----------+   +-------------+   +-----------+   +----------+
| Stripe   |   | Apple ASSN  |   | Google    |   | Clients  |
| Webhooks |   | V2 Webhooks |   | Play RTDN |   | (check)  |
+----------+   +-------------+   +-----------+   +----------+
      ^                ^                ^             |
      |                |                |             v
+----------+   +-------------+   +-----------+   +----------+
| Stripe   |   | App Store   |   | Google    |   | Web App  |
| Checkout |   | StoreKit 2  |   | Play BL6  |   | Flutter  |
+----------+   +-------------+   +-----------+   +----------+
```

**Flow:**

1. User purchases on any platform (Stripe Checkout, StoreKit 2, Google Play)
2. Provider sends server notification to the corresponding Edge Function
3. Edge Function validates, normalizes, and writes to `subscriptions` table
4. All clients check entitlements via Supabase (RLS-protected query or Edge Function)
5. `user_id` from Supabase Auth is the universal linking key

---

## 3 --- Data Model

### 3.1 `plans` Table

Defines available subscription tiers. Managed by the developer, not by users.

```sql
CREATE TABLE public.plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,          -- 'free', 'pro', 'premium'
  display_name  TEXT NOT NULL,                 -- 'Pro Plan'
  description   TEXT,
  features      JSONB NOT NULL DEFAULT '[]',   -- ['feature_a', 'feature_b', 'unlimited_x']
  -- Provider-specific price IDs (nullable = not available on that platform)
  stripe_price_id     TEXT,                    -- 'price_1ABC...'
  apple_product_id    TEXT,                    -- 'com.app.pro.monthly'
  google_product_id   TEXT,                    -- 'pro_monthly'
  -- Metadata
  price_cents   INTEGER NOT NULL,              -- Display price in cents (EUR)
  currency      TEXT NOT NULL DEFAULT 'EUR',
  interval      TEXT NOT NULL DEFAULT 'month', -- 'month' | 'year' | 'lifetime'
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed: plans are public read-only
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are publicly readable"
  ON public.plans FOR SELECT USING (true);
```

### 3.2 `subscriptions` Table

One active subscription per user. Source of truth for billing status.

```sql
CREATE TABLE public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES public.plans(id),
  -- Provider info
  provider                TEXT NOT NULL CHECK (provider IN ('stripe', 'apple', 'google')),
  provider_subscription_id TEXT NOT NULL,       -- Stripe sub_xxx, Apple originalTransactionId, Google purchaseToken
  provider_customer_id    TEXT,                 -- Stripe cus_xxx (nullable for mobile)
  -- Status
  status                  TEXT NOT NULL CHECK (status IN (
    'active', 'trialing', 'past_due', 'canceled', 'expired', 'paused'
  )),
  -- Periods
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  canceled_at             TIMESTAMPTZ,
  -- Metadata
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraints
  UNIQUE (provider, provider_subscription_id)
);

-- Index for fast entitlement lookups
CREATE INDEX idx_subscriptions_user_status
  ON public.subscriptions (user_id, status);

CREATE INDEX idx_subscriptions_provider
  ON public.subscriptions (provider, provider_subscription_id);

-- RLS: Users can only see their own subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via Edge Functions)
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.3 Entitlement Resolution

Entitlements are derived from the active subscription's plan, not stored separately.
This avoids sync issues between subscription changes and feature access.

```sql
-- View for easy entitlement checks
CREATE OR REPLACE VIEW public.user_entitlements AS
SELECT
  s.user_id,
  p.name AS plan_name,
  p.features,
  s.status,
  s.current_period_end,
  s.cancel_at_period_end
FROM public.subscriptions s
JOIN public.plans p ON p.id = s.plan_id
WHERE s.status IN ('active', 'trialing')
  AND s.current_period_end > now();
```

---

## 4 --- Edge Function Patterns

All webhook handlers follow the Consumer-Pro Edge Function pattern
(see KB Section 19) with additional signature verification.

### 4.1 Stripe Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId || !session.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
  );

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("stripe_price_id", subscription.items.data[0].price.id)
    .single();

  if (!plan) return;

  await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan_id: plan.id,
    provider: "stripe",
    provider_subscription_id: subscription.id,
    provider_customer_id: session.customer as string,
    status: subscription.status === "trialing" ? "trialing" : "active",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, {
    onConflict: "provider,provider_subscription_id",
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "expired",
    paused: "paused",
  };

  await supabase
    .from("subscriptions")
    .update({
      status: statusMap[subscription.status] ?? "expired",
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from("subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "stripe")
    .eq("provider_subscription_id", invoice.subscription as string);
}
```

### 4.2 Apple App Store Server Notifications V2

```typescript
// supabase/functions/apple-webhook/index.ts
//
// Apple sends JWS (JSON Web Signature) payloads.
// Verify using Apple's root certificate chain.
// Reference: https://developer.apple.com/documentation/appstoreservernotifications

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req: Request) => {
  const body = await req.json();
  const { signedPayload } = body;

  // 1. Decode and verify JWS (simplified --- use apple-app-store-server-library in production)
  const decoded = decodeSignedPayload(signedPayload);
  if (!decoded) {
    return new Response("Invalid payload", { status: 400 });
  }

  const { notificationType, subtype, data } = decoded;
  const { signedTransactionInfo } = data;
  const txn = decodeSignedPayload(signedTransactionInfo);

  if (!txn) {
    return new Response("Invalid transaction", { status: 400 });
  }

  // 2. Map Apple notification to subscription status
  const statusMap: Record<string, string> = {
    SUBSCRIBED: "active",
    DID_RENEW: "active",
    EXPIRED: "expired",
    DID_CHANGE_RENEWAL_STATUS: txn.autoRenewStatus === 1 ? "active" : "canceled",
    GRACE_PERIOD_EXPIRED: "expired",
    DID_FAIL_TO_RENEW: "past_due",
    REFUND: "expired",
    REVOKE: "expired",
  };

  const status = statusMap[notificationType] ?? "expired";

  // 3. Resolve user_id from appAccountToken (set during purchase via StoreKit 2)
  const userId = txn.appAccountToken; // Must be set to Supabase user_id during purchase
  if (!userId) {
    return new Response("Missing appAccountToken", { status: 400 });
  }

  // 4. Resolve plan
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("apple_product_id", txn.productId)
    .single();

  if (!plan) {
    return new Response("Unknown product", { status: 400 });
  }

  // 5. Upsert subscription
  await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan_id: plan.id,
    provider: "apple",
    provider_subscription_id: txn.originalTransactionId,
    status,
    current_period_start: new Date(txn.purchaseDate).toISOString(),
    current_period_end: new Date(txn.expiresDate).toISOString(),
    cancel_at_period_end: !txn.autoRenewStatus,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "provider,provider_subscription_id",
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

function decodeSignedPayload(jws: string): any | null {
  // Decode JWS payload (middle segment, base64url)
  // In production: verify signature chain against Apple Root CA
  try {
    const parts = jws.split(".");
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}
```

### 4.3 Google Play RTDN Handler

```typescript
// supabase/functions/google-webhook/index.ts
//
// Google Play sends Real-Time Developer Notifications via Pub/Sub.
// The Edge Function receives the decoded notification.
// Reference: https://developer.android.com/google/play/billing/rtdn-reference

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req: Request) => {
  // Google Pub/Sub sends a base64-encoded message
  const body = await req.json();
  const messageData = JSON.parse(atob(body.message.data));

  const { subscriptionNotification } = messageData;
  if (!subscriptionNotification) {
    return new Response("Not a subscription notification", { status: 200 });
  }

  const { notificationType, purchaseToken, subscriptionId } = subscriptionNotification;

  // 1. Verify purchase with Google Play Developer API
  const purchaseInfo = await verifyGooglePurchase(subscriptionId, purchaseToken);
  if (!purchaseInfo) {
    return new Response("Verification failed", { status: 400 });
  }

  // 2. Map Google notification type to status
  // Google notification types: 1=RECOVERED, 2=RENEWED, 3=CANCELED,
  // 4=PURCHASED, 5=ON_HOLD, 6=IN_GRACE_PERIOD, 7=RESTARTED,
  // 12=REVOKED, 13=EXPIRED
  const statusMap: Record<number, string> = {
    1: "active",     // RECOVERED
    2: "active",     // RENEWED
    3: "canceled",   // CANCELED
    4: "active",     // PURCHASED
    5: "paused",     // ON_HOLD
    6: "past_due",   // IN_GRACE_PERIOD
    7: "active",     // RESTARTED
    12: "expired",   // REVOKED
    13: "expired",   // EXPIRED
  };

  const status = statusMap[notificationType] ?? "expired";

  // 3. Resolve user_id from obfuscatedExternalAccountId (set during purchase)
  const userId = purchaseInfo.obfuscatedExternalAccountId;
  if (!userId) {
    return new Response("Missing account ID", { status: 400 });
  }

  // 4. Resolve plan
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("google_product_id", subscriptionId)
    .single();

  if (!plan) {
    return new Response("Unknown product", { status: 400 });
  }

  // 5. Upsert subscription
  await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan_id: plan.id,
    provider: "google",
    provider_subscription_id: purchaseToken,
    status,
    current_period_start: new Date(parseInt(purchaseInfo.startTimeMillis)).toISOString(),
    current_period_end: new Date(parseInt(purchaseInfo.expiryTimeMillis)).toISOString(),
    cancel_at_period_end: purchaseInfo.autoRenewing === false,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: "provider,provider_subscription_id",
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

async function verifyGooglePurchase(
  subscriptionId: string,
  purchaseToken: string,
): Promise<any | null> {
  // Use Google Play Developer API v3 to verify the purchase
  // Requires: GOOGLE_SERVICE_ACCOUNT_KEY env var (JSON key file content)
  // In production: use google-auth-library for JWT-based auth
  const packageName = Deno.env.get("GOOGLE_PACKAGE_NAME");
  const serviceAccountKey = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") ?? "{}");

  // Simplified --- in production, implement proper OAuth2 service account flow
  try {
    const accessToken = await getGoogleAccessToken(serviceAccountKey);
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getGoogleAccessToken(serviceAccountKey: any): Promise<string> {
  // Implement JWT-based service account authentication
  // This is a placeholder --- use a proper library in production
  throw new Error("Implement Google OAuth2 service account flow");
}
```

### 4.4 Entitlement Check Function

```typescript
// supabase/functions/check-entitlement/index.ts
//
// Client-callable function that returns the user's current entitlements.
// Called by both Web and Mobile clients.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/edgeConfig.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract user from JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing token" } }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Query active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(`
      status,
      current_period_end,
      cancel_at_period_end,
      plans (
        name,
        features
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .gt("current_period_end", new Date().toISOString())
    .order("current_period_end", { ascending: false })
    .limit(1)
    .single();

  if (!subscription) {
    // No active subscription --- return free tier
    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          plan: "free",
          features: [],
          status: "none",
          expiresAt: null,
          willCancel: false,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        plan: (subscription.plans as any).name,
        features: (subscription.plans as any).features,
        status: subscription.status,
        expiresAt: subscription.current_period_end,
        willCancel: subscription.cancel_at_period_end,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
```

---

## 5 --- Cross-Platform Sync

### 5.1 Linking Mechanism

The universal linking key is `user_id` from Supabase Auth.

| Platform | How user_id is passed | Where it ends up |
|----------|----------------------|------------------|
| **Stripe** | `metadata.user_id` on Checkout Session | Webhook reads it on `checkout.session.completed` |
| **Apple** | `appAccountToken` in StoreKit 2 purchase | ASSN V2 includes it in `signedTransactionInfo` |
| **Google** | `obfuscatedExternalAccountId` on purchase | RTDN + verification API returns it |

**Requirement:** All client implementations MUST pass the Supabase `user_id`
during the purchase flow. Without it, the webhook cannot link the subscription.

### 5.2 Conflict Resolution

If a user has subscriptions on multiple providers:

```
Priority: Take the highest-tier active subscription.

1. Query all active subscriptions for user_id
2. Join with plans to get sort_order
3. Return the plan with the highest sort_order
4. Display warning in account settings: "You have active subscriptions on multiple platforms"
```

The `check-entitlement` function already handles this by ordering by
`current_period_end DESC` and taking the first result. For explicit
priority, use `plans.sort_order`.

### 5.3 Grace Periods

| Provider | Grace Period | Behavior |
|----------|-------------|----------|
| **Stripe** | Configurable (default: 3 retries over ~2 weeks) | Status: `past_due` |
| **Apple** | 6-16 days (Apple manages) | Notification: `DID_FAIL_TO_RENEW` |
| **Google** | 3-7 days (configurable in Play Console) | Notification type: `6` (IN_GRACE_PERIOD) |

During grace period, subscription status is `past_due`.
Entitlement check treats `past_due` as **not active** --- user sees a
"Please update payment" banner but loses premium access.

---

## 6 --- Client-Side Patterns

### 6.1 React Hook: `useSubscription`

```typescript
// src/hooks/useSubscription.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Entitlement {
  plan: string;
  features: string[];
  status: "active" | "trialing" | "past_due" | "canceled" | "expired" | "none";
  expiresAt: string | null;
  willCancel: boolean;
}

export function useSubscription() {
  const query = useQuery<Entitlement>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { plan: "free", features: [], status: "none", expiresAt: null, willCancel: false };
      }

      const { data, error } = await supabase.functions.invoke("check-entitlement");
      if (error || !data.ok) {
        return { plan: "free", features: [], status: "none", expiresAt: null, willCancel: false };
      }

      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const hasFeature = (feature: string): boolean => {
    return query.data?.features.includes(feature) ?? false;
  };

  const isPro = query.data?.plan !== "free" && query.data?.status === "active";

  return {
    ...query,
    entitlement: query.data,
    hasFeature,
    isPro,
    isLoading: query.isLoading,
  };
}
```

### 6.2 React Component: `PaywallGate`

```tsx
// src/components/PaywallGate.tsx
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

interface PaywallGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PaywallGate({ feature, children, fallback }: PaywallGateProps) {
  const { hasFeature, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) return null;

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: show upgrade prompt
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <h3 className="text-lg font-semibold">Upgrade required</h3>
      <p className="text-muted-foreground">
        This feature requires a paid plan.
      </p>
      <button
        className="btn btn-primary"
        onClick={() => navigate("/pricing")}
      >
        View Plans
      </button>
    </div>
  );
}
```

### 6.3 Stripe Checkout Integration (Web)

```typescript
// src/features/billing/service/checkout.ts
import { supabase } from "@/lib/supabase";

export async function createCheckoutSession(priceId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // Call Edge Function that creates a Stripe Checkout Session
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { priceId },
  });

  if (error || !data.ok) {
    throw new Error(data?.error?.message ?? "Checkout failed");
  }

  return data.data.url; // Stripe Checkout URL
}
```

### 6.4 Flutter: Subscription Provider (Mobile)

```dart
// lib/domain/subscription_provider.dart
//
// Flutter implementation uses:
// - StoreKit 2 (iOS) via in_app_purchase package
// - Google Play Billing Library 6+ via in_app_purchase package
// - Supabase for entitlement verification (source of truth)

// Key principle: Purchase happens natively, but entitlement is
// ALWAYS verified against Supabase, never against local receipt alone.

// Purchase flow:
// 1. User taps "Subscribe" in Flutter app
// 2. in_app_purchase opens native purchase sheet
// 3. Native store processes payment
// 4. Store sends server notification to Edge Function
// 5. Edge Function updates Supabase subscriptions table
// 6. Flutter app calls check-entitlement Edge Function
// 7. UI updates to reflect active subscription

// IMPORTANT: Pass Supabase user_id during purchase:
// - iOS: Set appAccountToken to user_id
// - Android: Set obfuscatedExternalAccountId to user_id
```

---

## 7 --- Environment Variables

### 7.1 Required (Stripe --- Web)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

### 7.2 Required (Apple --- iOS)

```
APPLE_SHARED_SECRET=...
APPLE_BUNDLE_ID=com.yourapp.id
# Apple's root CA certificates for JWS verification
# Downloaded from: https://www.apple.com/certificateauthority/
```

### 7.3 Required (Google --- Android)

```
GOOGLE_PACKAGE_NAME=com.yourapp.id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 7.4 Client-Side (Vite)

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 8 --- Analytics Events

Extension of the mandatory events defined in `ref/growth/analytics.md`.

| Event | Trigger | Required Fields |
|-------|---------|-----------------|
| `subscription_started` | New subscription created | provider, plan_id, price_cents |
| `subscription_renewed` | Subscription renewed | provider, plan_id |
| `subscription_canceled` | User cancels | provider, plan_id, reason |
| `subscription_expired` | Subscription expires | provider, plan_id |
| `paywall_shown` | Paywall gate displayed | feature, context |
| `paywall_converted` | User upgrades from paywall | feature, plan_id |
| `checkout_started` | Checkout flow initiated | provider, plan_id |
| `checkout_completed` | Checkout flow completed | provider, plan_id, price_cents |
| `checkout_abandoned` | Checkout flow abandoned | provider, plan_id |

**No PII** in events. Use hashed user IDs. Price in cents, not formatted strings.

---

## 9 --- Security Checklist

- [ ] Stripe webhook signature verified (`stripe.webhooks.constructEvent`)
- [ ] Apple JWS payload verified against Apple Root CA certificate chain
- [ ] Google RTDN authenticated via Pub/Sub + service account
- [ ] No subscription data stored client-side (always server-verified)
- [ ] RLS on `subscriptions` table (users see only their own)
- [ ] `plans` table is public read-only (no sensitive data)
- [ ] All secrets in environment variables (never in code or client)
- [ ] Stripe publishable key (pk_) only key exposed to client
- [ ] Entitlement check requires valid JWT
- [ ] Webhook endpoints are idempotent (upsert, not insert)

---

## 10 --- Stripe Setup Checklist

1. Create Stripe account at stripe.com
2. Create Products in Stripe Dashboard (matching `plans` table)
3. Create Prices for each product (monthly / yearly)
4. Configure Customer Portal (cancellation, plan changes)
5. Register webhook endpoint: `https://<supabase-ref>.supabase.co/functions/v1/stripe-webhook`
6. Select webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
7. Copy webhook signing secret to Supabase Edge Function secrets
8. Test with Stripe CLI: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

---

## 11 --- App Store / Google Play Setup

### Apple (iOS)

1. Create subscription group in App Store Connect
2. Add subscription products (matching `plans.apple_product_id`)
3. Configure Server Notifications V2 URL: `https://<supabase-ref>.supabase.co/functions/v1/apple-webhook`
4. Configure Shared Secret for receipt validation
5. Implement StoreKit 2 in Flutter using `in_app_purchase` package
6. Pass `appAccountToken = supabaseUserId` during purchase

### Google (Android)

1. Create subscription products in Google Play Console
2. Configure Real-Time Developer Notifications (RTDN)
3. Create Cloud Pub/Sub topic + push subscription pointing to: `https://<supabase-ref>.supabase.co/functions/v1/google-webhook`
4. Create service account with Play Developer API access
5. Implement Google Play Billing in Flutter using `in_app_purchase` package
6. Pass `obfuscatedExternalAccountId = supabaseUserId` during purchase
