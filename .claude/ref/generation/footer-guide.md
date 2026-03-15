# Footer Structure Guide

> **Purpose:** Structural and content specification for the footer of every project.
> Colors, font sizes, and visual details are derived from the respective project design system (Tailwind tokens, CSS variables). This document defines **structure, sections, content, and behavior**.
> **Last updated:** February 2026

---

## 1. Overall Structure

The footer consists of two vertical areas, separated by a horizontal line:

```
┌─────────────────────────────────────────────────────────────────┐
│  FOOTER MAIN AREA                                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Column 1    │  │  Column 2    │  │  Column 3    │          │
│  │  Branding    │  │  Product     │  │  Legal       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  COPYRIGHT BAR                                                  │
│  © [YEAR] [COMPANY_NAME]. All rights reserved.                  │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

| Viewport | Layout | Alignment |
|----------|--------|-----------|
| **Desktop** (md+) | 3-column grid | Left-aligned |
| **Mobile** (<md) | 1-column, stacked | Centered |

---

## 2. Sections in Detail

### Column 1: Branding & Meta

Order of elements (vertically stacked):

```
1. Logo + Product name       (inline, horizontal)
2. Subtitle / Tagline        (short description text)
3. Social media icons        (inline, horizontal)
4. Language selector          (dropdown)
```

#### 2.1 Logo + Product Name

- Logo as image (e.g., `<img>`, approx. 32×32px)
- Product name as text beside it
- Both horizontal in one line

#### 2.2 Subtitle

- Short one-liner describing the product
- i18n key: e.g., `footer.subtitle`
- Limit max width (~200px) to control line breaks

#### 2.3 Social Media Icons

Horizontal row of icon links. Each link:

- Opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- Has an `aria-label` for accessibility
- Uses icon components (Lucide or custom SVG)

**Social media links:**

| Platform  | URL | Icon |
|-----------|-----|------|
| Instagram | `https://www.instagram.com/richi.solutions` | Instagram icon |
| LinkedIn  | `https://www.linkedin.com/company/richi-ai/` | LinkedIn icon |
| TikTok    | `https://tiktok.com/@richi.solutions` | TikTok icon (custom SVG) |
| YouTube   | `https://www.youtube.com/@Yves.Richel` | YouTube icon |

Projects can add their own social media links or replace the defaults above.

#### 2.4 Language Selector

- Dropdown menu with all supported languages
- Displays the currently selected language
- Globe icon + language name + chevron-down
- Minimum: `de`, `en`, `es`
- Project may add additional languages

---

### Column 2: Product Navigation

Heading + vertical link list:

```
[HEADING: e.g., "About [Product Name]"]

- Guide / Getting Started
- About Us
- FAQ
- Contact
```

#### Required Links

| Link    | Target           | i18n Key (example) |
|---------|------------------|---------------------|
| Guide   | `/<lang>/guide`  | `footer.guide`      |
| About Us| `/<lang>/about`  | `footer.about`      |
| FAQ     | `/<lang>/faq`    | `footer.faq`        |
| Contact | `/<lang>/contact`| `footer.contact`    |

#### Optional Links (project-specific)

- Changelog / Updates
- Blog
- API documentation
- Status page
- Pricing

---

### Column 3: Legal

Heading + vertical link list:

```
[HEADING: e.g., "Legal"]

- Imprint
- Privacy Policy
- Terms of Service
```

#### Required Links (legally mandated)

| Link           | Target                | i18n Key (example)  | Regulation      |
|----------------|-----------------------|---------------------|-----------------|
| Imprint        | `/<lang>/impressum`   | `footer.imprint`    | § 5 DDG         |
| Privacy Policy | `/<lang>/datenschutz` | `footer.privacy`    | GDPR Art. 13    |
| Terms of Service | `/<lang>/agb`       | `footer.terms`      | BGB §§ 305ff    |

> ⚠️ **These three links are MANDATORY and must not be omitted.**

---

### Copyright Line

Below a horizontal separator, centered:

```
© [CURRENT_YEAR] [COMPANY_NAME]. All rights reserved.
```

- Year is dynamically generated (`new Date().getFullYear()`)
- i18n key for "All rights reserved.": e.g., `footer.copyright`

---

## 3. Positioning

The footer is **NOT fixed** — it scrolls with the content. On mobile it appears above the fixed bottom navigation.

For general layout spacing rules (navbar positioning, `padding-bottom` on `<main>`, etc.), see `ref/generation/ui-ux-guide.md` Section 2.3.

### Spacing

| Element | Spacing |
|---------|---------|
| Footer outer padding | Horizontal: standard page padding (e.g., `px-4`), Vertical: approx. 32px (`py-8`) |
| Column gap | Responsive: approx. 32px (`gap-8`) |
| Copyright line | Top spacing: approx. 32px, own top border |
| Links between each other | Approx. 8px (`gap-2`) |
| Social icons between each other | Approx. 16px (`gap-4`) |

### Maximum Width

- Content container: max width matching the page (e.g., `max-w-7xl`, centered with `mx-auto`)

---

## 4. Visual Behavior

All visual properties use semantic design tokens — never fixed color values.
For the full token list and theming rules, see `ref/generation/ui-ux-guide.md` Section 9.

Footer-specific token mapping:

| Element | Token / Variant |
|---------|-----------------|
| Links | `muted-foreground` → `foreground` on hover |
| Copyright text | `muted-foreground`, small font size |
| Language selector | Ghost button variant |
| Active language | `accent` background in dropdown |

All interactive elements use `transition-colors`. No elaborate animations in the footer.

---

## 5. Accessibility

Uses the project-wide a11y standards from `ref/generation/ui-ux-guide.md` Section 8.

Footer-specific requirements:

| Requirement | Implementation |
|-------------|----------------|
| Semantic HTML | `<footer>` element wrapping the entire component |
| Navigation | `<nav>` around each link list column |
| External links | `aria-label` on icon-only social links |
| Language selector | Keyboard-navigable dropdown component |

---

## 6. i18n Keys (reference)

Minimum set of translation keys for the footer:

```json
{
  "footer": {
    "subtitle": "Your AI film advisor",
    "aboutProduct": "About MovieMind",
    "guide": "Getting Started",
    "about": "About Us",
    "faq": "FAQ",
    "contact": "Contact",
    "legal": "Legal",
    "imprint": "Imprint",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "copyright": "All rights reserved."
  }
}
```

> These keys must be present in all supported languages.

---

## 7. Checklist

### Required

- [ ] 3-column layout (desktop), 1-column (mobile)
- [ ] Logo + product name
- [ ] Subtitle (i18n)
- [ ] At least 1 social media link
- [ ] Language selector with all supported languages
- [ ] Product navigation links (Guide, About, FAQ, Contact)
- [ ] Legal links: **Imprint, Privacy Policy, Terms of Service**
- [ ] Copyright line with dynamic year
- [ ] All strings are i18n keys
- [ ] External links open in new tab with `rel="noopener noreferrer"`
- [ ] `aria-label` on icon-only links
- [ ] Semantic HTML (`<footer>`, `<nav>`)
- [ ] Colors exclusively via design tokens

### Optional

- [ ] Additional columns (e.g., "Products", "Resources")
- [ ] Newsletter signup
- [ ] App store badges
- [ ] Cookie settings link
- [ ] Status page link
