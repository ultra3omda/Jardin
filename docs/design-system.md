# Design System — École SaaS

> **Goal:** every UI in this product is **tailored to its target user role**. This document captures the design tokens, component library, accessibility baseline, and per-persona layout rules. Treat it as the contract that all `apps/web` and `apps/mobile` pages must honour.

---

## 1. Personas (`UserRole`)

The product targets 5 distinct personas. Every dashboard, list, form, and email **must** be designed for one of them — never a generic "user" view.

| Role | Primary device | Info density | Mental model | Key actions |
|---|---|---|---|---|
| **SUPER_ADMIN** | Desktop | High | Cross-tenant platform operator | Mint invites, view tenant analytics, audit logs, billing |
| **SCHOOL_ADMIN** | Desktop + tablet | High | School operations director | Enrollment, staff, billing summary, communications, settings |
| **TEACHER** | Tablet + mobile | Medium | Class manager | Daily attendance, grades, parent messages, schedule |
| **PARENT** | Mobile-first | Low | Child-centric observer | Read kids' grades/attendance/messages, pay bills, RSVP |
| **STAFF** | Mobile + dedicated kiosk | Narrow | Operational specialist (cantine / transport / health) | Quick check-ins, stock, transport rosters |

Mobile (Vague 2+) ships as **3 separate Expo binaries** (Parent / Teacher / Direction) — not one app with toggles. SUPER_ADMIN is web-only.

When designing a page :

1. Identify the role(s) it serves.
2. Pick the layout pattern from §4 below.
3. Use copy register from §5 (vouvoiement for PARENT, plainer for SCHOOL_ADMIN, terse for TEACHER's mobile actions).
4. If two roles need the same data, **build two views** instead of compromising on density.

---

## 2. Design tokens

### Color palette

> **Single source of truth:** `@ecole-saas/shared` → `design-tokens.ts`
> (`STRUCTURAL_TOKENS`, `WEB_BRAND_TOKENS`, `MOBILE_BRAND_TOKENS`). Guard tests
> (`apps/web/lib/ui/__tests__/design-tokens.test.ts`,
> `apps/mobile/lib/__tests__/design-tokens.test.ts`) fail CI on any drift.

V7 « Médina »: a cool **teal** brand (authority without feeling corporate), a
deep **navy** structure, warm **cream** paper and a **coral** accent. The brand
hierarchy is **deliberately different per platform** (locked 2026-05-24,
branding non touché):

| Token | Web | Mobile | Use |
|---|---|---|---|
| **primary** | teal `#02c4ad` (`--primary`) | electric coral `#ff4318` (`ambre`) | Buttons, links, focus rings, active states |
| **accent** | coral `#f2683f` (`ambre`) | teal `#02c4ad` + gold/grape | CTAs, badges, highlights |
| `navy-900…500` | `--navy-*` | `colors.navy` | Sidebar, strong ink, borders (identical) |
| `ink-900…300` | `--ink-*` | `colors.ink` | Headings → muted captions (identical) |
| `paper-50` | cream `#f4f4ef` | warm `#f7f2e9` | Page background |
| `surface` | white | white | Cards, inputs (identical) |
| `success` | `#16a34a` / `#dcfce7` | same | Confirmations, paid, attended |
| `info` | `#1d4ed8` / `#dbeafe` | same | Informational |
| `danger` | `#ef4444` | same | Errors, overdue, destructive actions |

White-label: a tenant `brand` overrides **only** the accent vars (`--primary`,
`--primary-hover`, `--ring`, `--secondary` on web; `theme.primary` on mobile) —
structural tokens never change. Brandless fallback is `DEFAULT_BRAND` (indigo),
a known white-label inconsistency vs the teal base, tracked separately.

Dark mode is **mandatory** on web (`.dark` overrides, teal lightened for
contrast). Mobile is light-only by design (V7-B).

### Typography

- Web: `font-display` → **Fraunces** (serif, headings), `font-sans` → **Public Sans** (body), `font-mono` → JetBrains Mono. Arabic (RTL): **Markazi Text** (display) + **IBM Plex Sans Arabic** (body). Mobile embeds the same Fraunces + Public Sans faces via expo-font (`app/_layout.tsx`).
- Scale: `text-sm` (12px) for meta, `text-base` (14-16px) for body, `text-lg` (18px) for sub-headers, `text-2xl` (24px) for page titles, `text-4xl` (36px) reserved for marketing.
- Headlines: `font-display font-semibold` (600). Body: `font-normal` (400). Captions: `font-medium text-ink-500`.
- Line height: `leading-relaxed` for body, `leading-tight` for headlines.

### Spacing

- Tailwind 4-px grid (`1` = 4px, `2` = 8px, etc.).
- Page padding: `px-4 md:px-8` mobile/tablet, `lg:px-12` desktop, max content width `max-w-7xl`.
- Card padding: `p-6` desktop, `p-4` mobile.
- Vertical rhythm between sections: `space-y-8` desktop, `space-y-6` mobile.

### Radii

- Inputs/buttons: `rounded-md` (6px).
- Cards: `rounded-lg` (8px).
- Avatars/badges: `rounded-full`.

### Shadows

- Cards: `shadow-sm`. Hover lifts: `shadow-md`. Avoid heavier shadows — keep the UI flat.

---

## 3. Component library

### Web (`apps/web`)

- **Base**: [shadcn/ui](https://ui.shadcn.com/) installed component-by-component (already used in V1 for `Button`, `Input`, `Label`, `Card`, `Form`).
- **Forms**: react-hook-form + zod (already in V1).
- **Tables**: TanStack Table when a list grows beyond ~20 rows or needs sort/filter; before that, plain `<ul>` of cards.
- **Icons**: lucide-react.
- **Charts** (V4+): recharts.
- **Date picker** (V3+): shadcn `Calendar`.

**Rule:** never reach for a heavy library when a 20-line component covers the need. Don't pull in Radix Toast if a `<div>` suffices.

### Mobile (Vague 2+)

- Expo SDK 51 + NativeWind (Tailwind-on-RN).
- shadcn-style primitives ported via `packages/ui-mobile`.
- Native bottom tab nav (Expo Router).

---

## 4. Layout patterns

Each pattern targets one or more personas. Match the page to the pattern, don't invent new ones unless none fit.

### 4.1 Auth pages (login, register, forgot, reset, verify)

Centered single-column. Max width `max-w-md`. Card-based form. Logo + 1-line tagline above. Footer link to alternate action (e.g. "Already have an account? Log in").

**Used by**: all personas — they share auth.

### 4.2 SCHOOL_ADMIN dashboard

Two-column: collapsible sidebar nav (left, 240px) + main content. Top bar with tenant switcher (V10+), user menu, notifications bell. KPI cards at top (4 max). Sectioned grid below.

### 4.3 TEACHER day view

Mobile: bottom tab nav (Today / Classes / Messages / Profile). Today = vertical timeline of periods with one-tap attendance.
Tablet: same content, two-column (timeline left, current-class detail right).

### 4.4 PARENT kid-feed

Mobile-only. Top: kid avatar selector (if multiple). Feed: chronological cards (today's note > yesterday's attendance > weekly grade > monthly bill). One CTA per card. No nested nav.

### 4.5 STAFF kiosk view

Single-purpose full-screen view (e.g. cantine check-in). Big buttons, minimal text, high-contrast colors. Always retains a back / sign-out affordance.

### 4.6 SUPER_ADMIN console

Like SCHOOL_ADMIN but cross-tenant. Tenant filter at top, raw data tables, audit log search, invite mint button prominent.

---

## 5. Copy & tone

### Language register per persona

- **PARENT**: vouvoiement, simple words, no jargon. "Votre enfant a obtenu 18/20 en mathématiques." Never "élève", say "votre enfant".
- **TEACHER**: terse, action-oriented. "Présents : 22 / 25. Marquer absents → ✓"
- **SCHOOL_ADMIN**: professional, complete sentences. "Le tenant comporte 3 classes actives et 87 élèves inscrits."
- **STAFF**: short imperatives. "Scanner le badge."
- **SUPER_ADMIN**: technical, can include IDs/timestamps. "Tenant `cl9...` — 14 invites pending, 3 expired this week."

### Error messages

- Lead with the cause from the user's perspective, then the action. "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email."
- Surface API error codes (e.g. `INVITE_TOKEN_EXPIRED`) by mapping them to FR copy in `apps/web/lib/auth/error-codes.ts` (or i18n catalog in V1.5 Group D).

### Empty states

Always informative, never just "Aucune donnée". Examples:
- "Aucun élève pour l'instant. Importez votre liste via le bouton ci-dessus."
- "Aucun message reçu. Vos enseignants vous écriront ici."

---

## 6. State patterns

### Loading

- Page-level: skeleton matching the final layout (cards, table rows) — **not** a centered spinner.
- Inline (button submit): replace label with spinner, disable button. Keep min-width.

### Error

- Inline form errors: red text below field, lucide `AlertCircle` icon.
- API errors: top-of-form alert banner with retry button when applicable.
- Page-level: error boundary card with "Reload" and "Contact" CTAs.

### Empty

See §5 above.

### Success

- Toast for transient confirmations (auto-dismiss 4s).
- Inline banner for permanent successes (e.g. "Compte vérifié ✓ — vous pouvez vous connecter").

---

## 7. Accessibility — WCAG 2.1 AA (non-negotiable)

From CLAUDE.md, must hold on every page :

- Color contrast ≥ 4.5:1 on body text (verify with browser devtools).
- All interactive elements keyboard-navigable. `<button>` not `<div onClick>`.
- Focus rings visible on every focusable element (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — `ring` maps to the teal primary / tenant accent).
- `aria-label` on icon-only buttons.
- Forms: every `<input>` has a `<label>` (or `aria-labelledby`).
- Form errors announced via `aria-describedby` linked to the error text.
- Avoid `placeholder`-as-label.
- Lang attribute set on the `<html>` element via next-intl (V1.5 Group D).
- Respect `prefers-reduced-motion` — gate animations behind it.

---

## 8. Performance budgets

From CLAUDE.md :

- Lighthouse mobile ≥ 90 on `/`, `/login`, `/dashboard`.
- Bundle size monitored (alert on +20%).
- Images: Next.js `<Image>` with explicit `width`/`height` (CLS = 0).
- Fonts: `display=swap` to prevent FOIT.

---

## 9. Versioning of this doc

When you introduce a new layout pattern (§4) or token (§2), add an entry to `docs/design-system-changelog.md` (created on first change). Keep this file the **current canonical state** — no historical drift.
