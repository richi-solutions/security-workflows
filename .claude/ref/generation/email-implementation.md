# Email System — Platform-Agnostic Implementation Guide

> **Purpose:** This guide serves as a template for implementing the email system in every project. Replace all `{{PROJECT_NAME}}` and `{{PROJECT_DISPLAY}}` placeholders with the respective values (e.g., `moviemind` / `MovieMind`).

---

## 1. Infrastructure

| Property | Value |
|---|---|
| **Email Provider** | [Resend](https://resend.com) |
| **Verified Domain** | `contact.richi.solutions` (SPF + DKIM via IONOS DNS) |
| **API Key Secret** | `RESEND_API_KEY` (backend secret, never in client code) |
| **Public Contact Address** | `contact@richi.solutions` |
| **Internal Address (Logins only)** | `info@richi.solutions` |
| **API Endpoint** | `https://api.resend.com/emails` |
| **Logo Storage** | Supabase Storage bucket `email-assets` (public) |

### Email Address Policy

| Address | Purpose | Visibility |
|---|---|---|
| `contact@richi.solutions` | Public contact address — footers, legal pages, support emails, contact form recipient | Public |
| `info@richi.solutions` | Internal only — service logins, account registrations | Internal |

**Rule:** All user-facing references (footer, imprint, privacy policy, terms, email templates, support links) MUST use `contact@richi.solutions`. The address `info@richi.solutions` is reserved for internal service logins and must NOT appear in any public-facing context.

### 1.1 Resend Setup

1. **Create account** at [resend.com](https://resend.com)
2. **Generate API key** under Settings → API Keys → "Create API Key"
3. **Verify domain** (already done for `contact.richi.solutions`):
   - SPF record and DKIM record configured in IONOS DNS
   - Any prefix (e.g., `kontakt.memobot@...`, `billing.memobot@...`) works immediately
4. **Store API key as backend secret** (name: `RESEND_API_KEY`)

### 1.2 Logo Storage Setup

Each project must upload its logo to the shared `email-assets` Supabase Storage bucket:

```sql
-- Bucket already exists; if setting up a new Supabase project:
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true);

CREATE POLICY "Public read access for email assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets');
```

**Requirements:**
- Format: PNG with transparency
- Max file size: **50 KB** (critical for email deliverability)
- Recommended dimensions: 96×96 px or 128×128 px
- Naming convention: `{{PROJECT_NAME}}-logo.png`

> ⚠️ **Do NOT use logos larger than 50 KB.** Large attachments hurt deliverability scores and may cause emails to land in spam. Compress before uploading.

---

## 2. Sender Schema

```
{type}.{project}@contact.richi.solutions
```

### Examples

| Email Type | Sender Address | Display Name |
|---|---|---|
| Contact Form | `kontakt.{{PROJECT_NAME}}@contact.richi.solutions` | `{{PROJECT_DISPLAY}} Kontakt` |
| Welcome Email | `willkommen.{{PROJECT_NAME}}@contact.richi.solutions` | `{{PROJECT_DISPLAY}}` |
| Password Reset | `auth.{{PROJECT_NAME}}@contact.richi.solutions` | `{{PROJECT_DISPLAY}} Security` |
| Newsletter / Updates | `news.{{PROJECT_NAME}}@contact.richi.solutions` | `{{PROJECT_DISPLAY}} News` |
| Billing / Subscription | `billing.{{PROJECT_NAME}}@contact.richi.solutions` | `{{PROJECT_DISPLAY}} Billing` |
| System / Fallback | `noreply.{{PROJECT_NAME}}@contact.richi.solutions` | `{{PROJECT_DISPLAY}}` |

> **Note:** No additional DNS configuration is needed. Any prefix works immediately since `contact.richi.solutions` is already fully verified.

---

## 3. Shared Email Layout (`_shared/emailLayout.ts`)

All projects share a single layout module that provides branding configuration, CID-embedded logo attachments, HTML rendering, and XSS protection.

### 3.1 AppBrand Interface

```typescript
export interface AppBrand {
  name: string;          // Display name, e.g. "MemoBot"
  logoUrl: string;       // Absolute URL to logo in Supabase Storage
  logoCid: string;       // Content-ID for inline attachment, e.g. "memobot-logo"
  primaryColor: string;  // Hex color, e.g. "#6366F1"
  accentColor: string;   // Hex color for secondary elements
  footerText: string;    // Footer line, e.g. "MemoBot — Ein Produkt von Richi"
  supportEmail: string;  // Support contact, e.g. "contact@richi.solutions"
  website: string;       // Product URL
}
```

**Example brand config:**

```typescript
export const MEMOBOT_BRAND: AppBrand = {
  name: "MemoBot",
  logoUrl: "https://<project-ref>.supabase.co/storage/v1/object/public/email-assets/memobot-logo.png",
  logoCid: "memobot-logo",
  primaryColor: "#6366F1",
  accentColor: "#818CF8",
  footerText: "MemoBot — Ein Produkt von Richi",
  supportEmail: "contact@richi.solutions",
  website: "https://memobot.richi.solutions",
};
```

### 3.2 CID-Embedded Logo (Inline Attachment)

**Problem:** Most email clients (Gmail, Outlook, Apple Mail) block external `<img src="https://...">` images by default. Users must manually click "Load images" to see the logo.

**Solution:** Embed the logo as a base64-encoded inline attachment using the `Content-ID` (CID) mechanism. The HTML references it via `<img src="cid:...">`, which renders immediately without any user interaction.

```typescript
// Cached in memory for the lifetime of the edge function instance
let _cachedLogoBase64: string | null = null;

export async function getLogoAttachment(brand: AppBrand): Promise<{
  filename: string;
  content: string;      // base64-encoded
  content_id: string;   // matches brand.logoCid
}> {
  if (!_cachedLogoBase64) {
    const res = await fetch(brand.logoUrl);
    if (!res.ok) throw new Error(`Failed to fetch logo: ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    _cachedLogoBase64 = btoa(binary);
  }
  return {
    filename: "logo.png",
    content: _cachedLogoBase64,
    content_id: brand.logoCid,
  };
}
```

**Key details:**
- The logo is fetched once per edge function cold start and cached in memory
- Resend accepts `attachments` with `content` (base64) and `content_id` fields
- The HTML template references the logo as `<img src="cid:${brand.logoCid}">`

### 3.3 HTML Layout Builder

The `buildEmailHtml()` function wraps any email body in a fully branded, responsive HTML layout:

- **Structure:** White card on light-grey background (`#F3F4F6`)
- **Logo:** CID-embedded in header (48×48 px, rounded corners)
- **Body:** Padded white card with 12px border-radius and subtle shadow
- **Footer:** Brand text, support email, copyright year
- **Responsive:** Adapts to mobile via `@media` queries (< 600px)
- **Outlook-safe:** Includes MSO-specific XML for consistent rendering
- **Preheader:** Optional invisible preheader text for email previews

```typescript
export function buildEmailHtml(
  brand: AppBrand,
  body: string,
  opts?: { preheader?: string },
): string {
  // Returns full <!DOCTYPE html> document with:
  // - CSS reset for email clients
  // - Branded header with CID logo
  // - White card body wrapper
  // - Branded footer with support link + copyright
  // - Optional preheader span (hidden, for inbox preview)
}
```

### 3.4 XSS Protection

All dynamic content **must** be escaped before inserting into HTML:

```typescript
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Usage in templates:
html: `<p>${escapeHtml(userInput)}</p>`
```

---

## 4. Edge Functions

### 4.1 `send-contact-email` (public, no JWT)

**Purpose:** Processes the website contact form. Sends two emails:
1. Internal notification to `contact@richi.solutions`
2. Confirmation to the sender

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I have a question about..."
}
```

**Implementation pattern:**

```typescript
import { buildEmailHtml, escapeHtml, getLogoAttachment, MEMOBOT_BRAND } from "../_shared/emailLayout.ts";

serve(async (req) => {
  // 1. Validate inputs
  // 2. Fetch logo attachment (cached)
  const logoAttachment = await getLogoAttachment(brand);

  // 3. Send internal notification
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: `${brand.name} Kontakt <kontakt.{{PROJECT_NAME}}@contact.richi.solutions>`,
      to: ["contact@richi.solutions"],
      subject: `Neue Kontaktanfrage von ${name}`,
      reply_to: email,
      html: buildEmailHtml(brand, internalBody, { preheader: `Nachricht von ${name}` }),
      attachments: [logoAttachment],   // ← CID attachment
    }),
  });

  // 4. Send confirmation to sender
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { ... },
    body: JSON.stringify({
      from: `${brand.name} <noreply.{{PROJECT_NAME}}@contact.richi.solutions>`,
      to: [email],
      subject: `Deine Nachricht an ${brand.name}`,
      html: buildEmailHtml(brand, confirmBody, { preheader: "Wir haben deine Nachricht erhalten" }),
      attachments: [logoAttachment],   // ← CID attachment
    }),
  });
});
```

### 4.2 `send-transactional-email` (JWT-protected)

**Purpose:** Sends all authenticated emails via a template system.

**Request:**
```json
{
  "template": "welcome",
  "to": "user@example.com",
  "data": { "name": "John" }
}
```

**Templates:**

| Template | From | Subject |
|---|---|---|
| `welcome` | `willkommen.{{PROJECT_NAME}}@...` | Welcome to {{PROJECT_DISPLAY}}! |
| `password_reset_confirm` | `auth.{{PROJECT_NAME}}@...` | Password successfully changed |
| `subscription_created` | `billing.{{PROJECT_NAME}}@...` | Your subscription is active |
| `subscription_cancelled` | `billing.{{PROJECT_NAME}}@...` | Subscription cancelled |
| `payment_succeeded` | `billing.{{PROJECT_NAME}}@...` | Payment confirmation |
| `payment_failed` | `billing.{{PROJECT_NAME}}@...` | Payment issue |
| `notification` | `noreply.{{PROJECT_NAME}}@...` | Generic notification |

All templates use `buildEmailHtml()` + `attachments: [logoAttachment]` for consistent branding and CID-embedded logo.

---

## 5. Resend API Integration

### 5.1 Basic API Call Structure

```typescript
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: "Display Name <address@contact.richi.solutions>",
    to: ["recipient@example.com"],
    subject: "Subject",
    reply_to: "reply@example.com",
    html: buildEmailHtml(brand, bodyContent),
    attachments: [logoAttachment],
  }),
});
```

### 5.2 Required Fields

| Field | Required | Description |
|---|---|---|
| `from` | ✅ | Sender in format `Display Name <address@contact.richi.solutions>` |
| `to` | ✅ | Array of recipient addresses |
| `subject` | ✅ | Email subject line |
| `html` | ✅ | HTML body (use `buildEmailHtml()`) |
| `attachments` | ✅ | Array with at least the CID logo attachment |
| `reply_to` | ❌ | Reply-to address (e.g., sender's email for contact forms) |

### 5.3 Error Handling

```typescript
try {
  const res = await fetch("https://api.resend.com/emails", { ... });
  if (!res.ok) {
    const errorData = await res.text();
    console.error("Resend API error:", errorData);
    throw new Error("Failed to send email");
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
} catch (error) {
  return new Response(
    JSON.stringify({ error: error.message || "Internal server error" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## 6. Security Requirements

- **CORS headers** on all endpoints
- **HTML escaping** (`escapeHtml()`) for all dynamic content → XSS protection
- **Email validation** via regex before sending
- **Rate limiting** recommended (e.g., max 5 contact requests per IP/hour)
- **RESEND_API_KEY** exclusively as backend secret, never in client code
- **Logo ≤ 50 KB** to avoid spam filters and deliverability issues

---

## 7. Email Footer (Standard)

Automatically included by `buildEmailHtml()`:

```html
<p style="font-size:12px;color:#9CA3AF;">
  {{PROJECT_DISPLAY}} — Ein Produkt von Richi<br>
  <a href="mailto:contact@richi.solutions">contact@richi.solutions</a>
</p>
<p style="font-size:11px;color:#D1D5DB;">
  © 2025 {{PROJECT_DISPLAY}}
</p>
```

---

## 8. Checklist for New Projects

- [ ] `RESEND_API_KEY` configured as backend secret
- [ ] Logo uploaded to `email-assets` bucket (PNG, ≤ 50 KB, 96–128 px)
- [ ] `AppBrand` config created with correct `logoUrl`, `logoCid`, colors
- [ ] `{{PROJECT_NAME}}` and `{{PROJECT_DISPLAY}}` replaced in all templates
- [ ] `send-contact-email` edge function created and deployed
- [ ] `send-transactional-email` edge function created and deployed
- [ ] Both functions use `getLogoAttachment()` + `attachments` array
- [ ] Contact form connected in frontend
- [ ] Welcome email triggered after registration
- [ ] Billing templates integrated into Stripe webhook
- [ ] Email delivery tested (inbox + spam check)
- [ ] Logo renders immediately without "Load images" prompt
