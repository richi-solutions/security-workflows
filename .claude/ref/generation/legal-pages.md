# Legal Pages Template & Prompt

> **Purpose:** This document serves as a complete template and prompt for every project to create legally compliant imprint, terms of service, and privacy policy.
> **Audience:** Developers / AI agent prompts
> **Last updated:** February 2026
> **Regulatory status:** GDPR, EU AI Act (Regulation 2024/1689), DDG, MStV, TDDDG, HGB, AO, BGB

---

## Table of Contents

1. [Overview & Context](#1-overview--context)
2. [Operator Information (mandatory details)](#2-operator-information-mandatory-details)
4. [Imprint — Template & Mandatory Components](#4-imprint--template--mandatory-components)
5. [Terms of Service — Template & Mandatory Components](#5-terms-of-service--template--mandatory-components)
6. [Privacy Policy — Template & Mandatory Components](#6-privacy-policy--template--mandatory-components)
7. [EU AI Act — Mandatory Disclosures](#7-eu-ai-act--mandatory-disclosures)
8. [Checklist: Project-Specific Additions](#8-checklist-project-specific-additions)
9. [Multilingual Support (i18n)](#9-multilingual-support-i18n)
10. [Implementation Notes](#10-implementation-notes)

---

## 1. Overview & Context

Every project must provide its own legal pages covering imprint, terms of service, and privacy policy. Each project handles authentication and payment processing independently.

### What each project is responsible for
- Authentication (own Supabase Auth)
- Payment processing (own Stripe account)
- Data processing and storage
- AI features and their disclosure
- Third-party integrations
- User accounts and passwords
- Cookie/tracking usage

---

## 2. Operator Information (mandatory details)

> **Email address policy:** All public-facing email references (imprint, privacy policy, terms, contact forms) MUST use `contact@richi.solutions`. The address `info@richi.solutions` is reserved for internal service logins only and must NOT appear in any legal page or footer. See `ref/generation/email-implementation.md` for the full policy.

Each project must provide its own operator information. Fill in the placeholders:

```
Company:            [PROJECT_COMPANY_NAME]
Owner:              [PROJECT_OWNER]: [NAME]
Legal form:         [PROJECT_LEGAL_FORM]
Address:            [PROJECT_ADDRESS_STREET], [PROJECT_ADDRESS_ZIP_CITY], [PROJECT_COUNTRY]
Email:              [PROJECT_EMAIL]  (default: contact@richi.solutions)
Website:            [PROJECT_WEBSITE]
VAT ID:             [PROJECT_VAT_ID_OR_SMALL_BUSINESS_NOTE]

Responsible for content (§ 18 para. 2 MStV):
                    [NAME], [ROLE], [PROJECT_COMPANY_NAME]

Competent supervisory authority (data protection):
                    [PROJECT_COMPETENT_SUPERVISORY_AUTHORITY]
```

---

## 4. Imprint — Template & Mandatory Components

### Legal basis: § 5 DDG (Digital Services Act)

Every project imprint MUST contain the following components:

### 4.1 Mandatory Details

| # | Component | Description | Source |
|---|-----------|-------------|--------|
| 1 | **Full name** of the provider | Name of the natural or legal person | § 5 para. 1 no. 1 DDG |
| 2 | **Address** | Service-of-process address (no P.O. box) | § 5 para. 1 no. 1 DDG |
| 3 | **Contact details** | Email + optionally phone | § 5 para. 1 no. 2 DDG |
| 4 | **Legal form** | e.g., sole proprietorship, GmbH, UG | § 5 para. 1 no. 3 DDG |
| 5 | **VAT ID** | Or note on small business exemption | § 5 para. 1 no. 6 DDG |
| 6 | **Responsible for content** | Person per § 18 para. 2 MStV | § 18 MStV |
| 7 | **Online dispute resolution** | Link to EU OS platform | Art. 14 ODR Regulation |
| 8 | **AI notice** | Transparency notice per EU AI Act | Art. 50 Regulation 2024/1689 |

### 4.2 Text Template (placeholders in `[SQUARE BRACKETS]`)

```
Imprint
Information pursuant to § 5 DDG (Digital Services Act)

--- Company Information ---
[PROJECT_COMPANY_NAME]
[PROJECT_OWNER_OR_MD]: [NAME]
[PROJECT_ADDRESS_STREET]
[PROJECT_ADDRESS_ZIP_CITY]
[PROJECT_COUNTRY]

Email: [PROJECT_EMAIL]
Phone: [PROJECT_PHONE_OR_NOTE]
Website: [PROJECT_WEBSITE]

VAT ID: [PROJECT_VAT_ID_OR_SMALL_BUSINESS_NOTE]
Legal form: [PROJECT_LEGAL_FORM]

--- Responsible for Content (§ 18 para. 2 MStV) ---
[NAME], [ROLE], [COMPANY_NAME]

--- Disclaimer ---

Liability for Content:
The content of this website has been created with the utmost care. As a service
provider, we are responsible for our own content on these pages pursuant to
§ 7 para. 1 DDG under general laws.

Liability for Links:
Our website contains links to external third-party websites over whose content
we have no influence. Pursuant to § 8 DDG, as a service provider we are not
obligated to monitor transmitted or stored third-party information.

Copyright:
All content and works created by [PROJECT_COMPANY_NAME] are protected by German
copyright law. Reproduction, editing, or distribution beyond the limits of
copyright law requires written consent.

Notice on AI Usage (EU AI Act):
[PROJECT_COMPANY_NAME] uses AI systems in accordance with Regulation (EU)
2024/1689 (EU AI Act). [PROJECT_AI_RISK_CATEGORY_AND_DETAILS]. No fully
automated decision-making with legal or significant effects on users takes
place. For more information, see our privacy policy.

--- Online Dispute Resolution ---
The European Commission provides a platform for online dispute resolution (OS).
We are [not obligated and not willing / willing] to participate in a dispute
resolution procedure before a consumer arbitration board.
Link: https://ec.europa.eu/consumers/odr/

```

---

## 5. Terms of Service — Template & Mandatory Components

### Legal basis: BGB §§ 305–310, Distance Selling Regulations, EU AI Act

### 5.1 Mandatory Components

| # | Section | Description | Regulation |
|---|---------|-------------|------------|
| 1 | **Scope & Provider** | Who offers what, full provider identification | § 312d BGB |
| 2 | **AI Usage (EU AI Act)** | Transparency about AI use, risk category, user rights | Art. 50, 86 Regulation 2024/1689 |
| 3 | **Service Description** | What the service includes | BGB §§ 305ff |
| 4 | **Intellectual Property** | Ownership of user and platform content | UrhG |
| 5 | **User Obligations** | Accurate information, no misuse | BGB |
| 6 | **Limitation of Liability** | Incl. AI liability, exceptions for cardinal obligations | BGB § 309 no. 7 |
| 7 | **Third-Party Services** | Supabase, Stripe, AI providers | GDPR Art. 28 |
| 8 | **Applicable Law & Jurisdiction** | German law, exclusion of CISG, jurisdiction | BGB |
| 9 | **Subscriptions & Payments** | Stripe, cancellation, withdrawal (§ 356 para. 5 BGB) | Distance selling law |
| 10 | **Account Management** | Deletion, data retention, changes | GDPR Art. 17 |
| 11 | **Right of Withdrawal** | 14-day period, expiry for digital content | §§ 355, 356 BGB |
| 12 | **Changes to Terms** | Notification obligation, right of objection | § 308 no. 5 BGB |
| 13 | **Contact** | Email address | § 312d BGB |

### 5.2 Text Template (core sections)

```
Terms of Service

--- 1. Scope and Provider ---
These terms of service govern the use of [PROJECT_PRODUCT_NAME],
operated by [PROJECT_COMPANY_NAME], [PROJECT_ADDRESS].

Our services include: [PROJECT_SERVICE_DESCRIPTION].

--- 2. AI Usage (EU AI Act) ---
[PROJECT_PRODUCT_NAME] uses AI systems in accordance with Regulation (EU)
2024/1689 (EU AI Act).

Areas of use: [PROJECT_AI_USE_CASES_LIST]

Risk category: [PROJECT_AI_RISK_CATEGORY]

[Include the following mandatory disclosures per Art. 50, 86 EU AI Act:]
- AI-generated content is labeled as such
- Users have the right to human review
- User data is not used to train external AI models
- AI models used: [PROJECT_AI_MODELS_LIST]

--- 3. Service Description ---
[PROJECT_DETAILED_SERVICE_DESCRIPTION]

--- 8. Subscriptions and Payments ---
Subscriptions are processed via Stripe Payments Europe Ltd.

Available plans: [PROJECT_PLAN_OVERVIEW]
Cancellation: At any time via the dashboard or Stripe customer portal.
Effective: At the end of the current billing period.

Right of withdrawal: The right of withdrawal for digital services expires
pursuant to § 356 para. 5 BGB upon commencement of contract performance,
provided the consumer has expressly consented.

--- 9. Account Management ---
Account deletion: You can delete your account in the settings.

Data retention: After account deletion, data is removed within 30 days,
unless legal retention obligations apply
(tax data: 10 years per § 147 AO, § 257 HGB).

--- 11. Right of Withdrawal ---
[PROJECT_COMPLETE_WITHDRAWAL_NOTICE_PER_BGB]
(14-day period, model withdrawal form per Annex 2 to Art. 246a § 1
para. 2 sentence 1 no. 1 EGBGB)
```

---

## 6. Privacy Policy — Template & Mandatory Components

### Legal basis: GDPR, TDDDG, EU AI Act

### 6.1 Mandatory Components

| # | Section | Description | Regulation |
|---|---------|-------------|------------|
| 1 | **Data controller** | Name, address, contact | Art. 13 para. 1 lit. a GDPR |
| 2 | **Data protection contact** | Email for inquiries (or DPO if appointed) | Art. 13 para. 1 lit. b GDPR |
| 3 | **AI Usage (EU AI Act)** | Areas of use, risk category, transparency, rights | Art. 50, 86 Regulation 2024/1689 |
| 4 | **Data categories** | What data is processed | Art. 13 para. 1 lit. d GDPR |
| 5 | **Legal basis** | Art. 6 GDPR — for each processing activity | Art. 13 para. 1 lit. c GDPR |
| 6 | **Hosting** | Where data is stored | Art. 13 para. 1 lit. f GDPR |
| 7 | **Data processors** | All third parties with DPA | Art. 28 GDPR |
| 8 | **Cookies & local storage** | Technically necessary vs. tracking | § 25 TDDDG |
| 9 | **Authentication** | Supabase Auth, data processed during login | Art. 13 para. 1 lit. e GDPR |
| 10 | **Payment processing** | Stripe, PCI DSS | Art. 13 para. 1 lit. e GDPR |
| 11 | **Data storage & security** | Technical measures | Art. 32 GDPR |
| 12 | **International data transfers** | SCC, EU-US DPF | Art. 46 GDPR |
| 13 | **Data subject rights** | Access, deletion, etc. | Art. 15–22 GDPR |
| 14 | **Retention periods** | Deletion periods per data category | Art. 13 para. 2 lit. a GDPR |
| 15 | **Local storage (PWA)** | Service worker, caching | § 25 TDDDG |
| 16 | **Updates** | Change history | Best practice |

### 6.2 Text Template (core sections)

```
Privacy Policy
GDPR-compliant · EU AI Act-compliant
Last updated: [DATE]
Applies to: [PROJECT_URL] and all subpages

--- 1. Data Controller ---
[PROJECT_COMPANY_NAME]
[PROJECT_OWNER]: [NAME]
[PROJECT_ADDRESS]
Email: [PROJECT_EMAIL]
Website: [PROJECT_WEBSITE]

--- 2. Data Protection Contact ---
For data protection inquiries: [PROJECT_PRIVACY_EMAIL]
[If DPO appointed: Data Protection Officer: [NAME], [EMAIL]]

--- 3. AI Usage (EU AI Act) ---
[PROJECT_PRODUCT_NAME] uses AI systems in accordance with Regulation (EU)
2024/1689 (EU AI Act) and the GDPR.

Areas of use:
- [PROJECT_AI_USE_CASE_1]
- [PROJECT_AI_USE_CASE_2]
- [PROJECT_AI_USE_CASE_N]

Risk category: [low risk / high risk / etc.]

Compliance notes:
- No fully automated decision-making with legal or significant effects
  (Art. 22 GDPR, Art. 86 EU AI Act)
- AI-generated content is labeled as such (Art. 50 EU AI Act)
- User data is not used to train external AI models
- AI models/providers used: [LIST_PROVIDERS]

Your AI-related rights:
- Right to human review of automated decisions
- Right to explanation of the logic behind AI recommendations
- Right to object to AI-based processing (Art. 21 GDPR)

--- 4. Data Categories ---
- Contact data (name, email, username)
- Technical data (IP address, browser, device, OS, pages visited)
- [PROJECT_SPECIFIC_DATA_CATEGORIES]
- Payment data (Stripe customer ID, subscription status — no credit card data)
- SSO data (auth token, product associations, sync status)
- [PROJECT_ADDITIONAL_CATEGORIES]

--- 7. Data Processors (Art. 28 GDPR) ---

- Supabase Inc. — Database, authentication, serverless functions (EU)
- Stripe Payments Europe Ltd. — Payment processing (EU, PCI DSS certified)
- [PROJECT_PROCESSOR_1] — [PURPOSE] ([LOCATION])
- [PROJECT_PROCESSOR_2] — [PURPOSE] ([LOCATION])
- [PROJECT_ADDITIONAL_PROCESSORS]

All data processors are contractually bound to GDPR compliance.
For transfers to third countries, SCCs and/or adequacy decisions
(EU-US Data Privacy Framework) are in place.

--- 8. Cookies and Local Storage ---
[Technically necessary cookies:]
- Session management
- Language preferences
- Authentication status
- [PROJECT_ADDITIONAL_COOKIES]

[Tracking/analytics cookies (if applicable):]
- [PROJECT_TRACKING_SERVICES — e.g., Google Analytics, Mixpanel]
- Consent is obtained via [CONSENT_TOOL]
- Legal basis: Art. 6(1)(a) GDPR, § 25 para. 1 TDDDG

[No tracking cookies (if applicable):]
Legal basis for technically necessary cookies:
Art. 6(1)(f) GDPR, § 25 para. 2 TDDDG

--- 9. Authentication ---
[PROJECT_PRODUCT_NAME] uses Supabase Auth for authentication.

Data processed during authentication:
- Email address, display name, avatar URL

Authentication data is stored securely using Supabase Row-Level Security (RLS).
Legal basis: Performance of contract (Art. 6(1)(b) GDPR).

--- 13. Data Subject Rights (GDPR) ---
- Right of access (Art. 15)
- Right to rectification (Art. 16)
- Right to erasure / "right to be forgotten" (Art. 17)
- Right to restriction of processing (Art. 18)
- Right to object (Art. 21)
- Right to data portability (Art. 20)
- Right to human review of automated decisions
  (Art. 22 GDPR, Art. 86 EU AI Act)
- Right to lodge a complaint with the competent supervisory authority

Competent supervisory authority:
[PROJECT_COMPETENT_SUPERVISORY_AUTHORITY]

--- 14. Retention Periods ---
- Account data: Deletion within 30 days after account deletion
- Tax-relevant data: 10 years (§ 147 AO, § 257 HGB)
- SSO tokens: 60-second validity, regular cleanup
- Server logs: max. 90 days
- [PROJECT_ADDITIONAL_PERIODS]
```

---

## 7. EU AI Act — Mandatory Disclosures

### Regulation (EU) 2024/1689

Every project that uses AI MUST disclose the following information:

### 7.1 Risk Categorization

| Category | Description | Obligations |
|----------|-------------|-------------|
| **Low risk** | Recommendations, summaries, chatbots | Transparency notice (Art. 50) |
| **High risk** | Creditworthiness, application screening, medical diagnosis | Conformity assessment, risk management system |
| **Prohibited** | Social scoring, manipulative AI | Not permitted |

### 7.2 Mandatory Disclosures by Article

| Article | Obligation | Implementation in Project |
|---------|-----------|-------------------------|
| Art. 50 | **Transparency obligation** | Label AI-generated content as such |
| Art. 86 | **Right to explanation** | Users can inquire about the logic behind AI recommendations |
| Art. 22 GDPR | **Automated decisions** | No fully automated profiling with legal effect |
| Art. 13-14 GDPR | **Information obligation** | Disclose AI processing in privacy policy |

### 7.3 AI Transparency Checklist

- [ ] AI areas of use are described
- [ ] Risk category is named
- [ ] AI-generated content is labeled (UI labeling)
- [ ] AI models/providers used are named
- [ ] Note: No use of user data for model training
- [ ] Right to human review is documented
- [ ] Right to object (Art. 21 GDPR) is mentioned
- [ ] AI liability disclaimer is included in terms of service

---

## 8. Checklist: Project-Specific Additions

> **IMPORTANT:** All of the following items MUST be filled in by the project operator.

### 8.1 Imprint

- [ ] Full name of the project operator (natural or legal person)
- [ ] Service-of-process address (NO P.O. box)
- [ ] Email address
- [ ] Phone number (or note that it will be added soon)
- [ ] Legal form (sole proprietorship, GmbH, UG, etc.)
- [ ] VAT ID or small business exemption note
- [ ] Commercial register number (if registered)
- [ ] Authorized representative(s) (for legal entities)
- [ ] Profession-specific details (if applicable — e.g., chamber, professional title)
- [ ] Supervisory authority (if industry-regulated)

### 8.2 Terms of Service

- [ ] Detailed service description of the project
- [ ] Pricing overview / plan structure
- [ ] Payment modalities (Stripe integration, plan structure)
- [ ] Withdrawal notice with model form
- [ ] Product-specific usage rules
- [ ] Minimum age / age restrictions (if applicable)
- [ ] Usage limits (API calls, storage, etc.) (if applicable)
- [ ] Fair use policy (if applicable)
- [ ] Jurisdiction of the project operator

### 8.3 Privacy Policy

- [ ] Own data categories (e.g., movie preferences, watchlists, ratings)
- [ ] Own data processors with DPA status
- [ ] Own AI models and their providers
- [ ] Own cookies / tracking tools (incl. consent management)
- [ ] Own retention periods
- [ ] Own PWA/service worker details
- [ ] Own Data Protection Officer (if appointed — mandatory from 20 employees)
- [ ] Own competent supervisory authority (depending on project's location)
- [ ] Video conferencing / communication tools (if applicable)
- [ ] Social media plugins (if applicable)
- [ ] Newsletter service (if applicable)
- [ ] A/B testing tools (if applicable)

### 8.4 EU AI Act

- [ ] Complete list of all AI use cases in the project
- [ ] Risk categorization for each use case
- [ ] UI labeling of AI-generated content
- [ ] AI models and providers (e.g., Google Gemini, OpenAI GPT)
- [ ] Own models / fine-tuning documented (if applicable)
- [ ] Opt-out option for AI processing (if offered)

---

## 9. Multilingual Support (i18n)

All legal pages MUST be provided in the supported languages:

| Language | Code | Namespace |
|----------|------|-----------|
| German   | `de` | `legal`   |
| English  | `en` | `legal`   |
| Spanish  | `es` | `legal`   |

### Files

```
src/locales/de/legal.json
src/locales/en/legal.json
src/locales/es/legal.json
```

### Rules

- **Every user-visible string** must be an i18n key
- **No hardcoded strings** in components
- **Key structure:** `imprint.*`, `privacy.*`, `terms.*`
- **Legal terms** must be correctly translated into the target language (no machine translation without review)

---

## 10. Implementation Notes

### 10.1 Page Structure (recommended)

```
src/pages/Impressum.tsx    → /impressum (or /:lang/impressum)
src/pages/AGB.tsx          → /agb (or /:lang/agb)
src/pages/Datenschutz.tsx  → /datenschutz (or /:lang/datenschutz)
```

### 10.2 Footer Links (mandatory)

The footer of every project page MUST contain links to all three legal pages:

```
Imprint | Terms of Service | Privacy Policy
```

### 10.3 Update Obligation

- Legal pages must be updated when services, data processors, or regulatory requirements change
- Significant changes must be communicated to users via email or in-app notification
- Date of last update must be visible

---

## Summary

Each project must provide:

| Component | Responsibility |
|---|---|
| Provider identification | Full operator details per § 5 DDG |
| Service description | What the project offers |
| Prices and plans | Stripe integration, plan overview |
| Data processors | All third parties with DPA |
| AI use cases | Disclosure per EU AI Act |
| Supervisory authority | Based on project operator location |
| Retention periods | Per data category |
| Security measures | Technical and organizational |
| EU AI Act compliance | Risk category, transparency, rights |
| i18n translations | All legal pages in supported languages |
