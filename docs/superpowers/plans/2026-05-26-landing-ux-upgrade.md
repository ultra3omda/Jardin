# V0.5 Klasso Landing UX Upgrade — "Tunisian Editorial" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the V0 Klasso landing page (`apps/web/app/[locale]/page.tsx`) from generic Tailwind/Inter to a distinctive "Tunisian Editorial" aesthetic with terracotta + cream + deep teal palette, Fraunces/Public Sans/Markazi typography, 5 new sections (Stats, SchoolSegments, DashboardMockup, FAQ, CTAFinal), Unsplash CC0 photos with duotone treatment, scroll-reveal animations, and bilingual FR/AR RTL polish.

**Architecture:** All work happens on branch `feat/landing-ux-upgrade` (forked from `origin/main 6c152f3`). Four phases P5→P8: design tokens, reusable atoms, section upgrades, finishing (images + i18n + ADR + PR). Components extend the existing `apps/web/components/landing/*` directory with an `atoms/` sub-folder. CSS vars added to `globals.css` coexist with the V1.6 white-label `--primary` override (terracotta is the *Klasso* brand on the public landing; tenant brand only takes over inside `(app)/*` routes). New dep: `motion` (~12KB gzip). No backend changes — DemoRequest API stays as shipped.

**Tech Stack:** Next.js 14 App Router · next-intl v4 (FR/AR sub-paths) · Tailwind CSS 3.4 (native RTL variants) · `next/font/google` (Fraunces, Public Sans, JetBrains Mono, Markazi Text, IBM Plex Sans Arabic) · `motion` (Framer Motion successor, `motion/react` import) · CSS `animation-timeline: view()` + IntersectionObserver fallback · OKLCH color space · Vitest (unit) · Playwright (e2e).

**Source spec:** `docs/superpowers/specs/2026-05-26-landing-ux-upgrade.md` (committed `6f6605c`). All numerics, copy, palette OKLCH values, photo URLs, and section composition are locked there — this plan operationalises that spec.

**Locked decisions:**
- Aesthetic direction: **Tunisian Editorial** (terracotta primary, paper cream bg, deep teal accent) — approved D26
- Numerals: **western 0123456789 everywhere**, even in AR locale (NO `Intl.NumberFormat('ar-TN')`) — approved D26
- Photo source: **Unsplash CC0**, stored in `apps/web/public/landing/` (not R2), served via `next/image`
- New dependency: **`motion` ^12** only (no Lottie, no GSAP, no AOS)

---

## File Structure (high-level decomposition)

**New files (created in this plan):**
```
apps/web/components/landing/atoms/
├── drop-cap.tsx               (P6 Task 5)  — first-letter editorial drop cap
├── scroll-reveal.tsx          (P6 Task 6)  — CSS animation-timeline + IO fallback
├── count-up.tsx               (P6 Task 7)  — KPI/stat counter, rAF-driven
├── deckle-edge.tsx            (P6 Task 8)  — SVG torn-paper top border
├── zellige-pattern.tsx        (P6 Task 9)  — Maghrebi 8-pointed star SVG bg
└── section.tsx                (P6 Task 10) — consistent padding + reveal wrapper

apps/web/components/landing/
├── stats.tsx                  (P7 Task 13) — 3 stats with CountUp
├── school-segments.tsx        (P7 Task 14) — 3 cards mapped to TenantType
├── dashboard-mockup.tsx       (P7 Task 16) — synthetic Sidi Bou Saïd dashboard
├── faq.tsx                    (P7 Task 21) — 8 Q/A, native <details>
└── cta-final.tsx              (P7 Task 22) — full-bleed dual CTA

apps/web/public/landing/
├── hero.webp                  (P8 Task 23) — main hero photo (Unsplash)
├── trust-book.webp            (P8 Task 23) — Trust section accent photo
└── icons/
    ├── seedling.svg           (P7 Task 14) — KINDERGARTEN icon
    ├── book-crescent.svg      (P7 Task 14) — PRIMARY_SCHOOL icon
    └── buildings.svg          (P7 Task 14) — MIXED icon

apps/web/components/landing/atoms/__tests__/
├── count-up.test.tsx          (P6 Task 7) — unit test for counter behavior
└── drop-cap.test.tsx          (P6 Task 5) — unit test for first-letter render

apps/web/e2e/
└── landing-ux.spec.ts         (P8 Task 26) — Playwright FR + AR smoke test

docs/adr/
└── 0008-landing-tunisian-editorial.md  (P8 Task 25)

docs/superpowers/plans/
└── 2026-05-26-landing-ux-upgrade.md    (this file)
```

**Modified files:**
```
apps/web/app/[locale]/layout.tsx          (P5 Task 2 — replace Inter with 5 fonts)
apps/web/app/[locale]/page.tsx            (P7 Task 11 — compose new 12-section layout)
apps/web/app/globals.css                  (P5 Task 3 — palette OKLCH + paper noise)
apps/web/tailwind.config.ts               (P5 Task 1 — palette + fontFamily)
apps/web/package.json                     (P5 Task 4 — add motion dep)
apps/web/components/landing/hero.tsx      (P7 Task 12 — photo + reveal + bilingual)
apps/web/components/landing/benefits.tsx  (P7 Task 15 — 3 → 6 piliers + drop cap)
apps/web/components/landing/modules-grid.tsx  (P7 Task 17 — palette refresh)
apps/web/components/landing/trust.tsx     (P7 Task 18 — micro-proof captions)
apps/web/components/landing/pricing.tsx   (P7 Task 19 — deckle edge + ochre badge)
apps/web/components/landing/demo-form.tsx (P7 Task 20 — success state polish)
apps/web/components/landing/footer.tsx    (P7 Task 24 — chapitre indicators)
apps/web/messages/fr.json                 (P8 Task 23 — new section keys)
apps/web/messages/ar.json                 (P8 Task 23 — new section keys, AR)
docs/roadmap.md                           (P8 Task 25 — V0.5 entry)
```

---

# Phase P5 — Design system tokens & typography (~0.4j)

## Task 1: Tailwind config — palette + fontFamily

**Files:**
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1.1: Extend `theme.extend.colors` with Tunisian Editorial palette**

Open `apps/web/tailwind.config.ts` and inside `theme.extend.colors` add (preserve existing `border`, `input`, `ring`, `background`, `primary`, etc.):

```ts
        // Tunisian Editorial palette (V0.5) — references CSS vars set in globals.css
        paper: {
          DEFAULT: 'oklch(var(--paper))',
          alt: 'oklch(var(--paper-2))',
          edge: 'oklch(var(--paper-edge))',
        },
        ink: {
          DEFAULT: 'oklch(var(--ink))',
          muted: 'oklch(var(--ink-2))',
          faded: 'oklch(var(--ink-mute))',
        },
        terracotta: {
          DEFAULT: 'oklch(var(--terracotta))',
          dark: 'oklch(var(--terracotta-2))',
        },
        ochre: 'oklch(var(--ochre))',
        'teal-deep': 'oklch(var(--teal-deep))',
        olive: 'oklch(var(--olive))',
        'rose-dust': 'oklch(var(--rose-dust))',
```

- [ ] **Step 1.2: Extend `theme.extend.fontFamily` with new font stacks**

Replace the existing `fontFamily` block with:

```ts
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        'sans-ar': ['var(--font-body-ar)', 'system-ui', 'sans-serif'],
        'display-ar': ['var(--font-display-ar)', 'Amiri', 'serif'],
      },
```

- [ ] **Step 1.3: Confirm Tailwind 3.4+ for native RTL variants**

Run: `pnpm --filter=@ecole-saas/web list tailwindcss`
Expected: version `3.4.x` or higher → Tailwind ships `rtl:` and `ltr:` variants natively, no plugin needed.

- [ ] **Step 1.4: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS (no TS errors).

- [ ] **Step 1.5: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "feat(landing): extend Tailwind theme with Tunisian Editorial palette + fonts"
```

---

## Task 2: Font loading via next/font/google

**Files:**
- Modify: `apps/web/app/[locale]/layout.tsx`

- [ ] **Step 2.1: Replace Inter import with 5 fonts**

Open `apps/web/app/[locale]/layout.tsx`. Replace the `import { Inter } from 'next/font/google'` line and the `const inter = Inter(...)` block with:

```tsx
import { Fraunces, Public_Sans, JetBrains_Mono, Markazi_Text, IBM_Plex_Sans_Arabic } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const markaziText = Markazi_Text({
  subsets: ['arabic', 'latin'],
  variable: '--font-display-ar',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  variable: '--font-body-ar',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
```

- [ ] **Step 2.2: Apply font variables to `<html>` className**

Inside the `LocaleLayout` return, replace `<html lang={locale} dir={dir} className={inter.variable}>` with:

```tsx
    <html
      lang={locale}
      dir={dir}
      className={`${fraunces.variable} ${publicSans.variable} ${jetBrainsMono.variable} ${markaziText.variable} ${ibmPlexArabic.variable}`}
    >
```

- [ ] **Step 2.3: Update body className for locale-appropriate font**

Replace `<body className="font-sans antialiased">` with:

```tsx
      <body className={locale === 'ar' ? 'font-sans-ar antialiased' : 'font-sans antialiased'}>
```

- [ ] **Step 2.4: Build to verify font subsets resolve**

Run: `pnpm --filter=@ecole-saas/web build`
Expected: build PASS, no font fetch errors.

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/app/[locale]/layout.tsx
git commit -m "feat(landing): load Fraunces/Public Sans/Markazi/IBM Plex AR via next/font"
```

---

## Task 3: CSS vars palette + paper grain in globals.css

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 3.1: Add Tunisian palette OKLCH vars to `:root`**

Inside the existing `:root` block (after `--radius: 0.5rem;`), append:

```css
    /* Tunisian Editorial palette (V0.5) — OKLCH for perceptual color uniformity */
    --paper:        0.97 0.012 75;     /* warm cream paper */
    --paper-2:      0.94 0.018 75;     /* darker cream for alt sections */
    --paper-edge:   0.88 0.025 70;     /* borders, dividers */

    --ink:          0.20 0.018 60;     /* deep warm black */
    --ink-2:        0.45 0.025 65;     /* muted earth brown */
    --ink-mute:     0.60 0.018 70;     /* faded ink */

    --terracotta:   0.58 0.16 38;      /* Tunisian clay (PRIMARY brand on landing) */
    --terracotta-2: 0.50 0.18 35;      /* darker hover state */
    --ochre:        0.75 0.12 75;      /* saharan ochre (badges) */
    --teal-deep:    0.40 0.06 195;     /* Mediterranean deep teal (Pricing featured) */
    --olive:        0.52 0.08 115;     /* olive (trust/success) */
    --rose-dust:    0.72 0.08 30;      /* dusty rose (AR accents) */
```

- [ ] **Step 3.2: Add paper-grain noise utility, duotone helper, reduced motion guard**

Inside the `@layer base { ... }`, append:

```css
  /* Paper grain — subtle SVG noise overlay for landing sections on --paper bg */
  .paper-grain::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
    z-index: 0;
  }

  /* Duotone treatment for landing photos */
  .landing-photo {
    filter: sepia(0.25) contrast(1.05) saturate(0.75) brightness(0.95);
  }

  /* Reduced motion override */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
```

- [ ] **Step 3.3: Smoke test — dev server**

Run: `pnpm --filter=@ecole-saas/web dev` (background)
Open `http://localhost:3000/fr` → no console errors. Stop dev server.

- [ ] **Step 3.4: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(landing): add OKLCH palette + paper-grain + reduced-motion CSS vars"
```

---

## Task 4: Add `motion` dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 4.1: Install motion**

Run: `pnpm --filter=@ecole-saas/web add motion@^12`
Expected: motion ^12.x.x added.

- [ ] **Step 4.2: Verify build**

Run: `pnpm --filter=@ecole-saas/web build`
Expected: PASS.

- [ ] **Step 4.3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(landing): add motion ^12 for hero reveal + micro-interactions"
```

---

# Phase P6 — Reusable atoms (~0.5j)

## Task 5: DropCap atom

**Files:**
- Create: `apps/web/components/landing/atoms/drop-cap.tsx`
- Test: `apps/web/components/landing/atoms/__tests__/drop-cap.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `apps/web/components/landing/atoms/__tests__/drop-cap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { DropCap } from '../drop-cap';

describe('DropCap', () => {
  it('renders the first character separately as a drop cap span', () => {
    render(<DropCap>Plus de bouts de papier</DropCap>);
    const cap = screen.getByText('P');
    expect(cap.tagName).toBe('SPAN');
    expect(cap.className).toMatch(/drop-cap/);
    expect(screen.getByText(/lus de bouts de papier/)).toBeInTheDocument();
  });

  it('returns null gracefully on empty children', () => {
    const { container } = render(<DropCap>{''}</DropCap>);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 5.2: Run test — verify it fails**

Run: `pnpm --filter=@ecole-saas/web test drop-cap`
Expected: FAIL with "Cannot find module '../drop-cap'".

- [ ] **Step 5.3: Implement DropCap**

Create `apps/web/components/landing/atoms/drop-cap.tsx`:

```tsx
import type { ReactNode } from 'react';

interface DropCapProps {
  children: string;
  className?: string;
}

/**
 * DropCap — editorial first-letter accent. Renders the first character of a string
 * inside a styled <span class="drop-cap"> followed by the rest of the text.
 * Style: 56px Fraunces italic, terracotta color, float on the inline-start side.
 */
export function DropCap({ children, className }: DropCapProps): ReactNode {
  if (!children || children.length === 0) return null;
  const first = children[0];
  const rest = children.slice(1);
  return (
    <p className={className}>
      <span className="drop-cap float-[inline-start] me-2 mt-1 font-display text-[56px] leading-none italic text-terracotta">
        {first}
      </span>
      {rest}
    </p>
  );
}
```

- [ ] **Step 5.4: Run test — verify it passes**

Run: `pnpm --filter=@ecole-saas/web test drop-cap`
Expected: PASS (2 tests).

- [ ] **Step 5.5: Commit**

```bash
git add apps/web/components/landing/atoms/drop-cap.tsx apps/web/components/landing/atoms/__tests__/drop-cap.test.tsx
git commit -m "feat(landing): add DropCap atom for editorial section intros"
```

---

## Task 6: ScrollReveal atom

**Files:**
- Create: `apps/web/components/landing/atoms/scroll-reveal.tsx`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 6.1: Implement ScrollReveal client component**

Create `apps/web/components/landing/atoms/scroll-reveal.tsx`:

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * ScrollReveal — fades + lifts children when entering the viewport.
 * - Modern browsers: CSS `animation-timeline: view()` (declarative, no JS).
 * - Fallback: IntersectionObserver toggles `data-revealed="true"` → CSS transition.
 * - prefers-reduced-motion: global override in globals.css makes animations near-instant.
 */
export function ScrollReveal({ children, className = '', delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => {
            el.setAttribute('data-revealed', 'true');
          }, delay);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 6.2: Append `.reveal` CSS rules to globals.css**

Inside `@layer base { ... }`, append:

```css
  /* ScrollReveal — animation-timeline if supported, transition fallback otherwise */
  .reveal {
    opacity: 0;
    transform: translateY(24px);
  }
  @supports (animation-timeline: view()) {
    .reveal {
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 50%;
    }
  }
  .reveal[data-revealed='true'] {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  @keyframes reveal-in {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
```

- [ ] **Step 6.3: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 6.4: Commit**

```bash
git add apps/web/components/landing/atoms/scroll-reveal.tsx apps/web/app/globals.css
git commit -m "feat(landing): add ScrollReveal atom with animation-timeline + IO fallback"
```

---

## Task 7: CountUp atom

**Files:**
- Create: `apps/web/components/landing/atoms/count-up.tsx`
- Test: `apps/web/components/landing/atoms/__tests__/count-up.test.tsx`

- [ ] **Step 7.1: Write the failing test**

Create `apps/web/components/landing/atoms/__tests__/count-up.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeAll, vi } from 'vitest';

import { CountUp } from '../count-up';

beforeAll(() => {
  class IO {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  // @ts-expect-error — test-only stub
  globalThis.IntersectionObserver = IO;
});

describe('CountUp', () => {
  it('renders initial value of 0 before entering viewport', () => {
    render(<CountUp to={247} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders suffix alongside value', () => {
    render(<CountUp to={100} suffix="%" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run test — verify it fails**

Run: `pnpm --filter=@ecole-saas/web test count-up`
Expected: FAIL with "Cannot find module '../count-up'".

- [ ] **Step 7.3: Implement CountUp**

Create `apps/web/components/landing/atoms/count-up.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * CountUp — animates 0 → `to` via requestAnimationFrame when viewport-visible.
 * Honors prefers-reduced-motion: jumps to final value.
 * Uses western numerals only (locked decision D26 — no Intl.NumberFormat).
 */
export function CountUp({ to, duration = 600, suffix = '', prefix = '', className = '' }: CountUpProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(to);
      return;
    }

    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - t) * (1 - t);
            setValue(Math.round(to * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
```

- [ ] **Step 7.4: Run test — verify it passes**

Run: `pnpm --filter=@ecole-saas/web test count-up`
Expected: PASS (2 tests).

- [ ] **Step 7.5: Commit**

```bash
git add apps/web/components/landing/atoms/count-up.tsx apps/web/components/landing/atoms/__tests__/count-up.test.tsx
git commit -m "feat(landing): add CountUp atom (rAF + IO, reduced-motion aware)"
```

---

## Task 8: DeckleEdge atom

**Files:**
- Create: `apps/web/components/landing/atoms/deckle-edge.tsx`

- [ ] **Step 8.1: Implement DeckleEdge SVG**

Create `apps/web/components/landing/atoms/deckle-edge.tsx`:

```tsx
interface DeckleEdgeProps {
  className?: string;
}

/**
 * DeckleEdge — decorative torn-paper top border for the featured Pricing card.
 * Color via currentColor — set via Tailwind text-* on the wrapping element.
 */
export function DeckleEdge({ className = '' }: DeckleEdgeProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 8"
      preserveAspectRatio="none"
      className={`block h-2 w-full text-current ${className}`}
    >
      <path
        d="M0 4 C 20 0, 40 8, 60 3 S 100 1, 130 5 S 170 2, 200 6 S 240 0, 270 4 S 310 7, 320 3 L 320 0 L 0 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}
```

- [ ] **Step 8.2: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 8.3: Commit**

```bash
git add apps/web/components/landing/atoms/deckle-edge.tsx
git commit -m "feat(landing): add DeckleEdge atom for Pricing featured card"
```

---

## Task 9: ZelligePattern atom

**Files:**
- Create: `apps/web/components/landing/atoms/zellige-pattern.tsx`

- [ ] **Step 9.1: Implement ZelligePattern**

Create `apps/web/components/landing/atoms/zellige-pattern.tsx`:

```tsx
interface ZelligePatternProps {
  className?: string;
  opacity?: number;
}

/**
 * ZelligePattern — abstracted 8-pointed Maghrebi star repeated as a subtle bg.
 * Custom-designed (not stock). Inherits color from text-* class on parent.
 */
export function ZelligePattern({ className = '', opacity = 0.08 }: ZelligePatternProps) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g fill='none' stroke='currentColor' stroke-width='1.2' opacity='${opacity}'><path d='M32 8 L36 24 L52 20 L40 32 L52 44 L36 40 L32 56 L28 40 L12 44 L24 32 L12 20 L28 24 Z'/><circle cx='32' cy='32' r='3'/></g></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 text-terracotta ${className}`}
      style={{ backgroundImage: url, backgroundSize: '64px 64px' }}
    />
  );
}
```

- [ ] **Step 9.2: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 9.3: Commit**

```bash
git add apps/web/components/landing/atoms/zellige-pattern.tsx
git commit -m "feat(landing): add ZelligePattern atom (Maghrebi 8-pointed star tile)"
```

---

## Task 10: Section wrapper atom

**Files:**
- Create: `apps/web/components/landing/atoms/section.tsx`

- [ ] **Step 10.1: Implement Section wrapper**

Create `apps/web/components/landing/atoms/section.tsx`:

```tsx
import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  id?: string;
  alt?: boolean;
  bleed?: boolean;
  grain?: boolean;
  className?: string;
}

/**
 * Section — consistent vertical rhythm wrapper for landing sections.
 * 96px padding on desktop (py-24), 64px on mobile (py-16). Toggle `alt` to use
 * the warmer `--paper-2` background for editorial rhythm.
 */
export function Section({
  children,
  id,
  alt = false,
  bleed = false,
  grain = false,
  className = '',
}: SectionProps) {
  const bg = alt ? 'bg-paper-alt' : 'bg-paper';
  return (
    <section
      id={id}
      className={`relative isolate ${bg} ${grain ? 'paper-grain' : ''} py-16 sm:py-24 ${className}`}
    >
      <div className={`relative z-10 ${bleed ? '' : 'container mx-auto px-4'}`}>{children}</div>
    </section>
  );
}
```

- [ ] **Step 10.2: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 10.3: Commit**

```bash
git add apps/web/components/landing/atoms/section.tsx
git commit -m "feat(landing): add Section wrapper atom (vertical rhythm + alt bg + grain)"
```

---

# Phase P7 — Sections upgrades (~1.5j)

## Task 11: Page composition — wire all 12 sections

**Files:**
- Modify: `apps/web/app/[locale]/page.tsx`

- [ ] **Step 11.1: Replace page composition**

Replace the entire contents of `apps/web/app/[locale]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { Benefits } from '@/components/landing/benefits';
import { CtaFinal } from '@/components/landing/cta-final';
import { DashboardMockup } from '@/components/landing/dashboard-mockup';
import { DemoForm } from '@/components/landing/demo-form';
import { Faq } from '@/components/landing/faq';
import { Footer } from '@/components/landing/footer';
import { Hero } from '@/components/landing/hero';
import { ModulesGrid } from '@/components/landing/modules-grid';
import { Pricing } from '@/components/landing/pricing';
import { SchoolSegments } from '@/components/landing/school-segments';
import { Stats } from '@/components/landing/stats';
import { Trust } from '@/components/landing/trust';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Klasso — L'école à l'ère numérique",
  description:
    "Plateforme SaaS pensée pour les écoles tunisiennes — élèves, parents, enseignants, finances. En un seul tableau de bord.",
};

interface Props {
  params: { locale: string };
}

/**
 * V0.5 Landing — Tunisian Editorial composition (12 sections).
 * Order locked by spec docs/superpowers/specs/2026-05-26-landing-ux-upgrade.md §3.
 */
export default function LandingPage({ params: { locale } }: Props) {
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <Hero />
      <Stats />
      <SchoolSegments />
      <Benefits />
      <DashboardMockup />
      <ModulesGrid />
      <Trust />
      <Pricing />
      <Faq />
      <CtaFinal />
      <DemoForm />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 11.2: Type-check (expect failures — components don't exist yet)**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: FAIL with "Cannot find module '@/components/landing/cta-final'" etc. — expected at this stage. Resolved as each section task completes.

- [ ] **Step 11.3: Commit the composition**

```bash
git add apps/web/app/[locale]/page.tsx
git commit -m "feat(landing): compose new 12-section layout for V0.5"
```

---

## Task 12: Hero — photo + reveal animation + bilingual subtitle

**Files:**
- Modify: `apps/web/components/landing/hero.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 12.1: Add hero keys to fr.json**

In `apps/web/messages/fr.json`, inside `landing.hero` after `"ctaSecondary": "Se connecter"`, append (mind the trailing comma added before this block):

```json
,
      "subtitleAr": "المدرسة في عصر رقمي",
      "trustStrip": "Hébergement EU + TN · RGPD-ready · Support FR/AR · Sans engagement",
      "descriptionUpgraded": "La plateforme SaaS pensée pour les écoles tunisiennes — élèves, parents, enseignants, finances. En un seul tableau de bord.",
      "photoAlt": "Salle de classe d'une école primaire tunisienne, lumière dorée"
```

- [ ] **Step 12.2: Add same keys to ar.json**

In `apps/web/messages/ar.json`, inside `landing.hero` after `"ctaSecondary"`, append:

```json
,
      "subtitleAr": "L'école à l'ère numérique",
      "trustStrip": "استضافة في الاتحاد الأوروبي وتونس · متوافق مع RGPD · دعم بالفرنسية والعربية · بدون التزام",
      "descriptionUpgraded": "منصة SaaS مصممة للمدارس التونسية — التلاميذ، الأولياء، المعلمون، المالية. في لوحة قيادة واحدة.",
      "photoAlt": "قاعة دراسية في مدرسة ابتدائية تونسية، ضوء ذهبي"
```

Note: in AR locale, `subtitleAr` actually holds the FR counterpart — we mirror the bilingual moment.

- [ ] **Step 12.3: Replace hero.tsx**

Replace `apps/web/components/landing/hero.tsx` entirely:

```tsx
'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';

export function Hero() {
  const t = useTranslations('landing.hero');
  const locale = useLocale();
  const title = t('title');
  const words = title.split(' ');

  return (
    <section className="relative isolate overflow-hidden bg-paper paper-grain">
      <div className="container mx-auto px-4 py-20 sm:py-28 md:py-32">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Text column */}
          <div className={locale === 'ar' ? 'md:order-2' : ''}>
            <h1 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl md:text-6xl">
              {words.map((word, i) => (
                <motion.span
                  key={`${word}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
                  className="inline-block me-[0.25em]"
                >
                  {word}
                </motion.span>
              ))}
              <span className="mt-2 block text-terracotta">{t('subtitle')}</span>
            </h1>
            <p
              className={`mt-4 ${locale === 'ar' ? 'font-sans' : 'font-display-ar'} text-2xl italic text-ink-muted`}
              lang={locale === 'ar' ? 'fr' : 'ar'}
              dir={locale === 'ar' ? 'ltr' : 'rtl'}
            >
              {t('subtitleAr')}
            </p>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              {t('descriptionUpgraded')}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={'#demo-form' as Route}
                className="inline-flex h-12 items-center justify-center rounded-md bg-terracotta px-8 text-base font-medium text-paper shadow-lg transition hover:bg-terracotta-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                {t('ctaPrimary')}
              </Link>
              <Link
                href={'/login' as Route}
                className="inline-flex h-12 items-center justify-center rounded-md border border-paper-edge bg-paper px-8 text-base font-medium text-ink transition hover:bg-paper-alt"
              >
                {t('ctaSecondary')}
              </Link>
            </div>
            <p className="mt-8 text-sm text-ink-faded">{t('trustStrip')}</p>
          </div>

          {/* Photo column */}
          <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${locale === 'ar' ? 'md:order-1' : ''}`}>
            <Image
              src="/landing/hero.webp"
              alt={t('photoAlt')}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover landing-photo"
            />
            <div
              aria-hidden
              className="absolute inset-0 mix-blend-multiply"
              style={{
                background:
                  'linear-gradient(135deg, oklch(var(--terracotta) / 0.35), oklch(var(--teal-deep) / 0.25))',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 12.4: Commit (photo file added in Task 23 — temporary 404 in dev acceptable)**

```bash
git add apps/web/components/landing/hero.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): upgrade Hero — duotone photo + word reveal + bilingual subtitle"
```

---

## Task 13: Stats section

**Files:**
- Create: `apps/web/components/landing/stats.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 13.1: Add `stats` namespace to fr.json**

After the `hero` block (before `benefits`), insert:

```json
    "stats": {
      "items": {
        "rgpd": { "value": "100", "suffix": "%", "label": "Conformité RGPD", "sublabel": "et isolation multi-tenant" },
        "modules": { "value": "4", "suffix": "", "label": "Modules en roadmap", "sublabel": "livrés en 2026" },
        "languages": { "value": "2", "suffix": "×2", "label": "Bilingue FR · العربية", "sublabel": "Web · Mobile" }
      }
    },
```

- [ ] **Step 13.2: Add same to ar.json**

```json
    "stats": {
      "items": {
        "rgpd": { "value": "100", "suffix": "%", "label": "الامتثال الكامل لـ RGPD", "sublabel": "وعزل البيانات متعدد المستأجرين" },
        "modules": { "value": "4", "suffix": "", "label": "وحدات في خارطة الطريق", "sublabel": "تُسلّم خلال 2026" },
        "languages": { "value": "2", "suffix": "×2", "label": "ثنائية اللغة FR · العربية", "sublabel": "ويب · جوال" }
      }
    },
```

- [ ] **Step 13.3: Implement Stats**

Create `apps/web/components/landing/stats.tsx`:

```tsx
import { useTranslations } from 'next-intl';

import { CountUp } from './atoms/count-up';
import { Section } from './atoms/section';

const ITEMS = ['rgpd', 'modules', 'languages'] as const;

export function Stats() {
  const t = useTranslations('landing.stats.items');
  return (
    <Section alt>
      <div className="grid grid-cols-1 gap-12 text-center sm:grid-cols-3">
        {ITEMS.map((key) => {
          const value = Number(t(`${key}.value`));
          const suffix = t(`${key}.suffix`);
          return (
            <div key={key} className="flex flex-col items-center">
              <span className="font-mono text-5xl font-semibold text-terracotta sm:text-6xl">
                <CountUp to={value} suffix={suffix} />
              </span>
              <span className="mt-3 font-display text-lg font-medium text-ink">{t(`${key}.label`)}</span>
              <span className="mt-1 text-sm text-ink-faded">{t(`${key}.sublabel`)}</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
```

- [ ] **Step 13.4: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: Stats no longer errors (other missing components still error — fixed in later tasks).

- [ ] **Step 13.5: Commit**

```bash
git add apps/web/components/landing/stats.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): add Stats section (3 honest stats, CountUp animated)"
```

---

## Task 14: SchoolSegments section + custom SVG icons

**Files:**
- Create: `apps/web/components/landing/school-segments.tsx`
- Create: `apps/web/public/landing/icons/seedling.svg`
- Create: `apps/web/public/landing/icons/book-crescent.svg`
- Create: `apps/web/public/landing/icons/buildings.svg`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 14.1: Create seedling SVG (KINDERGARTEN icon)**

Create `apps/web/public/landing/icons/seedling.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
  <path d="M24 42 V 22" />
  <path d="M24 22 C 18 22, 14 18, 14 12 C 20 12, 24 16, 24 22 Z" />
  <path d="M24 22 C 30 22, 34 18, 34 12 C 28 12, 24 16, 24 22 Z" />
  <path d="M14 42 H 34" />
</svg>
```

- [ ] **Step 14.2: Create book-crescent SVG (PRIMARY_SCHOOL icon)**

Create `apps/web/public/landing/icons/book-crescent.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
  <path d="M8 12 H 24 V 38 H 8 Z" />
  <path d="M24 12 H 40 V 38 H 24 Z" />
  <path d="M24 12 V 38" />
  <path d="M34 8 a 4 4 0 1 0 3 6.5" />
</svg>
```

- [ ] **Step 14.3: Create buildings SVG (MIXED icon)**

Create `apps/web/public/landing/icons/buildings.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
  <rect x="6" y="18" width="16" height="22" />
  <rect x="22" y="10" width="20" height="30" />
  <path d="M10 24 H 18 M 10 30 H 18 M 26 16 H 38 M 26 22 H 38 M 26 28 H 38" />
</svg>
```

- [ ] **Step 14.4: Add `schoolSegments` namespace to fr.json**

After `stats`, insert:

```json
    "schoolSegments": {
      "title": "Pour chaque type d'établissement",
      "subtitle": "Klasso s'adapte à votre structure pédagogique.",
      "items": {
        "kindergarten": { "name": "Jardins d'enfants", "ageRange": "Maternelle · 3 à 5 ans", "description": "Inscription souple, adaptée aux rythmes courts. Photos, parents, présences." },
        "primary": { "name": "Écoles primaires", "ageRange": "CP → CM2 · 6 à 11 ans", "description": "Suivi pédagogique, bulletins trimestriels, carnets de correspondance." },
        "mixed": { "name": "Établissements mixtes", "ageRange": "Maternelle + Primaire", "description": "Vue d'ensemble consolidée pour groupes scolaires multi-niveaux." }
      }
    },
```

- [ ] **Step 14.5: Add same to ar.json**

```json
    "schoolSegments": {
      "title": "لكل نوع من المؤسسات",
      "subtitle": "كلاسو يتكيّف مع هيكلك التربوي.",
      "items": {
        "kindergarten": { "name": "رياض الأطفال", "ageRange": "ما قبل المدرسة · 3 إلى 5 سنوات", "description": "تسجيل مرن، يلائم الإيقاع القصير. الصور والأولياء والحضور." },
        "primary": { "name": "المدارس الابتدائية", "ageRange": "السنة الأولى → السادسة · 6 إلى 11 سنة", "description": "متابعة تربوية، بطاقات أعداد فصلية، دفاتر مراسلة." },
        "mixed": { "name": "مؤسسات مختلطة", "ageRange": "روضة + ابتدائي", "description": "نظرة موحّدة على المجموعات المدرسية متعدّدة المستويات." }
      }
    },
```

- [ ] **Step 14.6: Implement SchoolSegments**

Create `apps/web/components/landing/school-segments.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Section } from './atoms/section';

const ITEMS = [
  { key: 'kindergarten', icon: '/landing/icons/seedling.svg' },
  { key: 'primary', icon: '/landing/icons/book-crescent.svg' },
  { key: 'mixed', icon: '/landing/icons/buildings.svg' },
] as const;

export function SchoolSegments() {
  const t = useTranslations('landing.schoolSegments');
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
        <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
      </div>
      <div className="mt-14 grid gap-8 md:grid-cols-3">
        {ITEMS.map(({ key, icon }) => (
          <article key={key} className="rounded-2xl border border-paper-edge bg-paper p-8 transition hover:border-terracotta hover:shadow-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
              <Image src={icon} alt="" width={36} height={36} />
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold text-ink">{t(`items.${key}.name`)}</h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-faded">{t(`items.${key}.ageRange`)}</p>
            <p className="mt-4 leading-relaxed text-ink-muted">{t(`items.${key}.description`)}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 14.7: Commit**

```bash
git add apps/web/components/landing/school-segments.tsx apps/web/public/landing/icons apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): add SchoolSegments section (3 cards mapped to TenantType + SVG icons)"
```

---

## Task 15: Benefits — 3 → 6 piliers with drop cap

**Files:**
- Modify: `apps/web/components/landing/benefits.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 15.1: Replace `benefits` namespace in fr.json**

Replace the whole `"benefits": {...}` block in `apps/web/messages/fr.json` with:

```json
    "benefits": {
      "title": "Pourquoi Klasso",
      "intro": "Plus de bouts de papier, plus de tableaux Excel oubliés sur clé USB. Klasso rend visible ce qui était dispersé, automatique ce qui était répétitif, et collaboratif ce qui était silencieux.",
      "items": {
        "time": { "title": "Gain de temps", "description": "Les tâches répétitives (appels, présences, bulletins) en quelques clics." },
        "paperless": { "title": "Zéro papier", "description": "Toutes les fiches élèves et bulletins en ligne. Économie réelle, geste écologique réel." },
        "mobileParents": { "title": "Mobile-first parents", "description": "Les parents voient les infos sur leur téléphone — disponible dès été 2026." },
        "rgpd": { "title": "RGPD européen", "description": "Isolation multi-tenant testée, audit logs, export et droit à l'oubli." },
        "support": { "title": "Support en français et arabe", "description": "Notre équipe répond en moins de 24h ouvrées, dans votre langue." },
        "migration": { "title": "Migration depuis Excel", "description": "Import CSV en masse. Vos données existantes, intactes, en 1 clic." }
      }
    },
```

- [ ] **Step 15.2: Replace `benefits` in ar.json**

```json
    "benefits": {
      "title": "لماذا كلاسو",
      "intro": "لا مزيد من قصاصات الورق، ولا جداول إكسل منسية على ذاكرة USB. يجعل كلاسو ما كان مشتتاً مرئياً، وما كان متكرراً تلقائياً، وما كان صامتاً تعاونياً.",
      "items": {
        "time": { "title": "ربح الوقت", "description": "المهام المتكررة (نداء، حضور، بطاقات) في بضع نقرات." },
        "paperless": { "title": "بدون ورق", "description": "كل البطاقات والكشوفات على الإنترنت. توفير حقيقي، التزام بيئي حقيقي." },
        "mobileParents": { "title": "أولوية الجوال للأولياء", "description": "يرى الأولياء المعلومات على هاتفهم — متوفّر صيف 2026." },
        "rgpd": { "title": "متوافق مع RGPD الأوروبي", "description": "عزل متعدد المستأجرين مُختبر، سجلات تدقيق، تصدير وحق النسيان." },
        "support": { "title": "دعم بالفرنسية والعربية", "description": "فريقنا يجيب خلال 24 ساعة عمل، بلغتك." },
        "migration": { "title": "الترحيل من إكسل", "description": "استيراد CSV بالجملة. بياناتك الحالية، سليمة، بنقرة واحدة." }
      }
    },
```

- [ ] **Step 15.3: Replace benefits.tsx**

```tsx
import { useTranslations } from 'next-intl';
import { Clock, Leaf, Smartphone, Shield, MessageSquare, Upload } from 'lucide-react';

import { DropCap } from './atoms/drop-cap';
import { Section } from './atoms/section';

const ITEMS = [
  { key: 'time', icon: Clock },
  { key: 'paperless', icon: Leaf },
  { key: 'mobileParents', icon: Smartphone },
  { key: 'rgpd', icon: Shield },
  { key: 'support', icon: MessageSquare },
  { key: 'migration', icon: Upload },
] as const;

export function Benefits() {
  const t = useTranslations('landing.benefits');
  return (
    <Section>
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
        <DropCap className="mt-6 text-lg leading-relaxed text-ink-muted">{t('intro')}</DropCap>
      </div>
      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="rounded-2xl border border-paper-edge bg-paper p-8 transition hover:border-terracotta hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
              <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold text-ink">{t(`items.${key}.title`)}</h3>
            <p className="mt-3 leading-relaxed text-ink-muted">{t(`items.${key}.description`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 15.4: Commit**

```bash
git add apps/web/components/landing/benefits.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): expand Benefits to 6 piliers with drop cap intro"
```

---

## Task 16: DashboardMockup section

**Files:**
- Create: `apps/web/components/landing/dashboard-mockup.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 16.1: Add `dashboardMockup` namespace to fr.json**

After `benefits`, insert:

```json
    "dashboardMockup": {
      "title": "Tout votre établissement, en un coup d'œil",
      "subtitle": "Aperçu fictif — École Primaire Sidi Bou Saïd",
      "greeting": "Bonjour Mme Hadia 👋",
      "kpis": {
        "students": "Élèves inscrits",
        "classes": "Classes actives",
        "attendance": "Présence moyenne",
        "alerts": "Alertes"
      },
      "activity": {
        "title": "Activité récente",
        "items": [
          "5 nouveaux élèves inscrits cette semaine",
          "Bulletin 2e trimestre disponible le 15 mars",
          "2 absences non justifiées à régulariser"
        ]
      },
      "cta": "Voir tous les élèves →"
    },
```

- [ ] **Step 16.2: Add same to ar.json**

```json
    "dashboardMockup": {
      "title": "كل مؤسستك في لمحة",
      "subtitle": "معاينة افتراضية — مدرسة سيدي بوسعيد الابتدائية",
      "greeting": "صباح الخير، السيدة هادية 👋",
      "kpis": {
        "students": "التلاميذ المسجّلون",
        "classes": "الأقسام الناشطة",
        "attendance": "متوسّط الحضور",
        "alerts": "تنبيهات"
      },
      "activity": {
        "title": "النشاط الأخير",
        "items": [
          "5 تلاميذ جدد سُجّلوا هذا الأسبوع",
          "بطاقة الفصل الثاني متاحة في 15 مارس",
          "غيابان دون مبرر بحاجة إلى تسوية"
        ]
      },
      "cta": "عرض كل التلاميذ ←"
    },
```

- [ ] **Step 16.3: Implement DashboardMockup**

Create `apps/web/components/landing/dashboard-mockup.tsx`:

```tsx
import { useTranslations } from 'next-intl';

import { CountUp } from './atoms/count-up';
import { Section } from './atoms/section';

const KPIS = [
  { key: 'students', value: 247, suffix: '' },
  { key: 'classes', value: 12, suffix: '' },
  { key: 'attendance', value: 94, suffix: '%' },
  { key: 'alerts', value: 3, suffix: '' },
] as const;

export function DashboardMockup() {
  const t = useTranslations('landing.dashboardMockup');
  const activityItems = t.raw('activity.items') as string[];

  return (
    <Section alt>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
        <p className="mt-4 font-mono text-sm uppercase tracking-wider text-ink-faded">{t('subtitle')}</p>
      </div>

      <div
        className="relative mx-auto mt-14 max-w-5xl rounded-2xl border border-paper-edge bg-paper shadow-xl"
        style={{ background: 'linear-gradient(180deg, oklch(var(--paper)) 0%, oklch(var(--teal-deep) / 0.04) 100%)' }}
      >
        <div className="flex items-center gap-2 border-b border-paper-edge px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-terracotta/60" />
          <span className="h-3 w-3 rounded-full bg-ochre/60" />
          <span className="h-3 w-3 rounded-full bg-olive/60" />
          <span className="ms-4 font-mono text-xs text-ink-faded">klasso.tn · École Primaire Sidi Bou Saïd 🇹🇳</span>
        </div>

        <div className="p-6 sm:p-10">
          <p className="font-display text-2xl text-ink">{t('greeting')}</p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {KPIS.map(({ key, value, suffix }) => (
              <div key={key} className="rounded-xl border border-paper-edge bg-paper p-5">
                <div className="font-mono text-3xl font-semibold text-terracotta">
                  <CountUp to={value} suffix={suffix} />
                </div>
                <div className="mt-1 text-sm text-ink-muted">{t(`kpis.${key}`)}</div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="font-display text-lg font-semibold text-ink">{t('activity.title')}</h3>
            <ul className="mt-4 space-y-2">
              {activityItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-ink-muted">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-terracotta" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button type="button" disabled className="mt-8 inline-flex items-center rounded-md border border-paper-edge bg-paper-alt px-5 py-2 text-sm font-medium text-ink opacity-80">
            {t('cta')}
          </button>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 16.4: Commit**

```bash
git add apps/web/components/landing/dashboard-mockup.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): add DashboardMockup (Sidi Bou Saïd synthetic data, KPI CountUp)"
```

---

## Task 17: ModulesGrid — palette refresh

**Files:**
- Modify: `apps/web/components/landing/modules-grid.tsx`

- [ ] **Step 17.1: Replace modules-grid.tsx**

```tsx
import { useTranslations } from 'next-intl';
import {
  Users, Heart, GraduationCap, Receipt, Utensils, Stethoscope, type LucideIcon,
} from 'lucide-react';

import { Section } from './atoms/section';

type Status = 'available' | 'soon' | 'later';

interface Mod {
  key: 'students' | 'parents' | 'teachers' | 'billing' | 'cantine' | 'health';
  icon: LucideIcon;
  status: Status;
}

const ITEMS: ReadonlyArray<Mod> = [
  { key: 'students', icon: Users, status: 'available' },
  { key: 'parents', icon: Heart, status: 'soon' },
  { key: 'teachers', icon: GraduationCap, status: 'soon' },
  { key: 'billing', icon: Receipt, status: 'later' },
  { key: 'cantine', icon: Utensils, status: 'later' },
  { key: 'health', icon: Stethoscope, status: 'later' },
];

const STATUS_CLASS: Record<Status, string> = {
  available: 'bg-olive/15 text-olive',
  soon: 'bg-ochre/20 text-ink',
  later: 'bg-paper-edge text-ink-faded',
};

export function ModulesGrid() {
  const t = useTranslations('landing.modules');
  return (
    <Section id="modules">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
        <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map(({ key, icon: Icon, status }) => (
          <div key={key} className="group rounded-2xl border border-paper-edge bg-paper p-6 transition hover:border-terracotta hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta transition group-hover:rotate-[5deg]">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}>
                {t(`items.${key}.status`)}
              </span>
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold text-ink">{t(`items.${key}.name`)}</h3>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 17.2: Commit**

```bash
git add apps/web/components/landing/modules-grid.tsx
git commit -m "refactor(landing): refresh ModulesGrid palette (olive/ochre/paper-edge badges)"
```

---

## Task 18: Trust — micro-proof captions

**Files:**
- Modify: `apps/web/components/landing/trust.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 18.1: Replace `trust` block in fr.json**

```json
    "trust": {
      "title": "Une plateforme de confiance",
      "items": {
        "rgpd": { "title": "RGPD-ready", "description": "Isolation multi-tenant testée, audit logs, export et suppression des données utilisateurs.", "proof": "Conforme RGPD · 2026" },
        "hosting": { "title": "Hébergement sécurisé", "description": "Serveurs européens (Neon, Vercel) + CDN local. Sauvegardes quotidiennes.", "proof": "EU + TN edge · Daily backups" },
        "support": { "title": "Support bilingue", "description": "Équipe FR/AR, réponse sous 24 heures ouvrées.", "proof": "Lun-Ven · 9h–17h GMT+1" },
        "updates": { "title": "Mises à jour continues", "description": "Nouvelles fonctionnalités mensuelles, sans intervention de votre part.", "proof": "Dernière màj : il y a 3 jours" }
      }
    },
```

- [ ] **Step 18.2: Replace `trust` block in ar.json**

```json
    "trust": {
      "title": "منصة جديرة بالثقة",
      "items": {
        "rgpd": { "title": "متوافق مع RGPD", "description": "عزل متعدد المستأجرين مُختبر، سجلات تدقيق، تصدير وحذف بيانات المستخدمين.", "proof": "متوافق مع RGPD · 2026" },
        "hosting": { "title": "استضافة آمنة", "description": "خوادم أوروبية (Neon, Vercel) + CDN محلي. نسخ احتياطي يومي.", "proof": "EU + TN edge · نسخ يومي" },
        "support": { "title": "دعم ثنائي اللغة", "description": "فريق فرنسي/عربي، إجابة خلال 24 ساعة عمل.", "proof": "اث-جم · 9–17 GMT+1" },
        "updates": { "title": "تحديثات مستمرة", "description": "ميزات جديدة شهرياً دون تدخل منك.", "proof": "آخر تحديث: قبل 3 أيام" }
      }
    },
```

- [ ] **Step 18.3: Replace trust.tsx**

```tsx
import { useTranslations } from 'next-intl';
import { Shield, Server, MessageCircle, RefreshCw, type LucideIcon } from 'lucide-react';

import { Section } from './atoms/section';

interface Item {
  key: 'rgpd' | 'hosting' | 'support' | 'updates';
  icon: LucideIcon;
}

const ITEMS: ReadonlyArray<Item> = [
  { key: 'rgpd', icon: Shield },
  { key: 'hosting', icon: Server },
  { key: 'support', icon: MessageCircle },
  { key: 'updates', icon: RefreshCw },
];

export function Trust() {
  const t = useTranslations('landing.trust');
  return (
    <Section>
      <h2 className="text-center font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex flex-col">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-olive/15 text-olive">
              <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold text-ink">{t(`items.${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`items.${key}.description`)}</p>
            <p className="mt-3 font-mono text-xs text-ink-faded">{t(`items.${key}.proof`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 18.4: Commit**

```bash
git add apps/web/components/landing/trust.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): upgrade Trust section with micro-proof captions"
```

---

## Task 19: Pricing — deckle edge + ochre badge

**Files:**
- Modify: `apps/web/components/landing/pricing.tsx`

- [ ] **Step 19.1: Replace pricing.tsx**

```tsx
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { DeckleEdge } from './atoms/deckle-edge';
import { Section } from './atoms/section';

type TierKey = 'starter' | 'standard' | 'pro';
const TIERS: ReadonlyArray<{ key: TierKey; featured: boolean }> = [
  { key: 'starter', featured: false },
  { key: 'standard', featured: true },
  { key: 'pro', featured: false },
];

export function Pricing() {
  const t = useTranslations('landing.pricing');
  return (
    <Section id="pricing" alt>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
        <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        {TIERS.map(({ key, featured }) => {
          const features = t.raw(`tiers.${key}.features`) as string[];
          return (
            <div
              key={key}
              className={
                featured
                  ? 'relative flex flex-col rounded-2xl border-2 border-teal-deep bg-paper shadow-xl'
                  : 'flex flex-col rounded-2xl border border-paper-edge bg-paper'
              }
            >
              {featured && (
                <>
                  <DeckleEdge className="-mt-px text-teal-deep" />
                  <div className="absolute -top-4 start-1/2 -translate-x-1/2 rounded-full bg-ochre px-4 py-1 text-xs font-semibold text-ink shadow rtl:translate-x-1/2">
                    {t('popular')}
                  </div>
                </>
              )}
              <div className="flex flex-1 flex-col p-8">
                <h3 className="font-display text-2xl font-semibold text-ink">{t(`tiers.${key}.name`)}</h3>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-mono text-5xl font-semibold text-terracotta">{t(`tiers.${key}.price`)}</span>
                  <span className="text-sm text-ink-muted">{t(`tiers.${key}.unit`)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-faded">{t(`tiers.${key}.limit`)}</p>
                <ul className="mt-6 space-y-3">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-ink-muted">
                      <Check className="mt-0.5 h-5 w-5 flex-none text-terracotta" strokeWidth={2} aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={'#demo-form' as Route}
                  className={
                    featured
                      ? 'mt-8 inline-flex h-11 items-center justify-center rounded-md bg-terracotta px-6 text-sm font-medium text-paper transition hover:bg-terracotta-dark'
                      : 'mt-8 inline-flex h-11 items-center justify-center rounded-md border border-terracotta px-6 text-sm font-medium text-terracotta transition hover:bg-terracotta hover:text-paper'
                  }
                >
                  {t('cta')}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
```

- [ ] **Step 19.2: Commit**

```bash
git add apps/web/components/landing/pricing.tsx
git commit -m "feat(landing): upgrade Pricing with deckle edge + ochre badge + mono pricing"
```

---

## Task 20: DemoForm — success state polish

**Files:**
- Modify: `apps/web/components/landing/demo-form.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 20.1: Read the current demo-form.tsx to locate the success branch**

Use the Read tool to inspect `apps/web/components/landing/demo-form.tsx`. Identify the JSX block rendered when the submission succeeds (usually conditioned on a state like `submitState === 'success'` or `requestId`).

- [ ] **Step 20.2: Replace the success branch markup**

Replace the success block with this polished version (preserve any surrounding state-machine wiring and the `id="demo-form"` anchor on the parent section):

```tsx
<div className="mx-auto max-w-md text-center">
  <svg
    aria-hidden
    viewBox="0 0 80 80"
    className="mx-auto h-20 w-20 text-terracotta"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M10 24 L 40 44 L 70 24" />
    <path d="M10 24 V 60 H 70 V 24" />
    <path d="M10 60 L 40 40 L 70 60" />
    <path d="M52 8 V 24 M 44 14 H 60" strokeLinecap="round" />
  </svg>
  <h3 className="mt-6 font-display text-2xl font-semibold text-ink">
    {t('success.title')}
  </h3>
  <p className="mt-3 leading-relaxed text-ink-muted">{t('success.description')}</p>
  {requestId && (
    <p className="mt-6 font-mono text-xs uppercase tracking-wider text-ink-faded">
      ID : <span className="text-ink">{requestId}</span>
    </p>
  )}
</div>
```

If the existing component does not expose `requestId` as a local variable, keep the success block simpler (omit the ID line) — but do NOT introduce a new prop. The Section wrapper around the form should remain `id="demo-form"` so the existing `#demo-form` anchors continue to work.

- [ ] **Step 20.3: Update fr.json success.description**

In `apps/web/messages/fr.json`, set `landing.demoForm.success.description` to:

```json
"description": "Vous allez recevoir une confirmation par email. Un membre de notre équipe vous contactera dans les 24 heures ouvrées."
```

- [ ] **Step 20.4: Update ar.json success.description**

In `apps/web/messages/ar.json`, set `landing.demoForm.success.description` to:

```json
"description": "ستتلقى تأكيداً عبر البريد الإلكتروني. سيتواصل معك أحد أعضاء فريقنا خلال 24 ساعة عمل."
```

- [ ] **Step 20.5: Commit**

```bash
git add apps/web/components/landing/demo-form.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): polish DemoForm success state (envelope+feather SVG + tracking ID)"
```

---

## Task 21: FAQ — 8 Q/A native `<details>`

**Files:**
- Create: `apps/web/components/landing/faq.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 21.1: Add `faq` namespace to fr.json**

Insert before `footer`:

```json
    "faq": {
      "title": "Questions fréquentes",
      "subtitle": "Tout ce que les directeurs nous demandent en démo.",
      "items": [
        { "q": "Combien coûte Klasso pour mon école ?", "a": "Le tarif est par élève par mois (5/4/3 TND HT selon le palier). Engagement annuel, 30 jours d'essai gratuit sans carte." },
        { "q": "Comment migrer depuis mes fichiers Excel actuels ?", "a": "Klasso inclut un import CSV en masse (V2 — déjà livré). Vous téléchargez un modèle, vous le remplissez, vous l'envoyez : tous vos élèves sont créés en quelques secondes." },
        { "q": "Les parents peuvent-ils accéder à Klasso ?", "a": "Une application parents dédiée arrive à l'été 2026 (V3 de la roadmap). En attendant, vous pouvez exporter des fiches PDF par élève." },
        { "q": "Mes données restent-elles en Tunisie ?", "a": "Hébergement primaire UE (Neon Postgres + Vercel) + CDN edge avec point de présence local TN. Sauvegardes quotidiennes chiffrées." },
        { "q": "Comment Klasso protège-t-il les données des mineurs ?", "a": "RGPD strict, isolation multi-tenant testée par tests automatisés, audit logs, et droit à l'oubli implémenté côté API." },
        { "q": "Y a-t-il un engagement annuel ?", "a": "Les tarifs affichés supposent un engagement annuel (paiement trimestriel possible sur le plan Pro). 30 jours d'essai gratuit avant toute facturation." },
        { "q": "Klasso fonctionne-t-il en arabe ?", "a": "Oui — interface complète FR + AR avec support RTL natif. Vous basculez de langue à tout moment via le sélecteur dans le footer." },
        { "q": "Comment formez-vous mon équipe pédagogique ?", "a": "Onboarding personnalisé inclus dans le plan Pro (visio + documentation). Plans Starter/Standard : support email + vidéos tutoriels." }
      ]
    },
```

- [ ] **Step 21.2: Add same to ar.json**

```json
    "faq": {
      "title": "أسئلة شائعة",
      "subtitle": "كل ما يسألنا عنه المديرون خلال عروض الديمو.",
      "items": [
        { "q": "كم يكلّف كلاسو لمدرستي؟", "a": "السعر لكل تلميذ شهرياً (5/4/3 د.ت دون رسوم حسب الباقة). التزام سنوي مع 30 يوماً تجربة مجانية بدون بطاقة." },
        { "q": "كيف أرحّل بياناتي الحالية من إكسل؟", "a": "كلاسو يتضمّن استيراد CSV بالجملة (V2 — مُسلّم). تحمّل قالباً، تملؤه، ترفعه: يُنشأ جميع التلاميذ في ثوانٍ." },
        { "q": "هل يمكن للأولياء الوصول إلى كلاسو؟", "a": "تطبيق الأولياء المخصّص يصل صيف 2026 (V3 من خارطة الطريق). في الانتظار، يمكنك تصدير بطاقات PDF لكل تلميذ." },
        { "q": "هل تبقى بياناتي في تونس؟", "a": "استضافة أساسية في الاتحاد الأوروبي (Neon Postgres + Vercel) + CDN edge مع نقطة وصول محلية بتونس. نسخ احتياطي يومي مشفّر." },
        { "q": "كيف يحمي كلاسو بيانات القاصرين؟", "a": "التزام صارم بـ RGPD، عزل متعدد المستأجرين مُختبر آلياً، سجلات تدقيق، وحق النسيان مُطبّق على مستوى API." },
        { "q": "هل هناك التزام سنوي؟", "a": "الأسعار المعروضة تفترض التزاماً سنوياً (دفع فصلي ممكن في باقة Pro). 30 يوماً تجربة مجانية قبل أي فوترة." },
        { "q": "هل يعمل كلاسو بالعربية؟", "a": "نعم — واجهة كاملة بالفرنسية والعربية مع دعم RTL أصلي. يمكنك التبديل في أي وقت عبر اختيار اللغة في التذييل." },
        { "q": "كيف تُدرّبون فريقي التربوي؟", "a": "تأهيل مخصّص مدمج في باقة Pro (فيديو + وثائق). باقات Starter/Standard: دعم عبر البريد + فيديوهات تعليمية." }
      ]
    },
```

- [ ] **Step 21.3: Implement Faq component**

Create `apps/web/components/landing/faq.tsx`:

```tsx
import { useTranslations } from 'next-intl';

import { Section } from './atoms/section';

interface QA { q: string; a: string; }

export function Faq() {
  const t = useTranslations('landing.faq');
  const items = t.raw('items') as QA[];

  return (
    <Section id="faq">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-lg text-ink-muted">{t('subtitle')}</p>
        </div>
        <div className="mt-12 divide-y divide-paper-edge border-y border-paper-edge">
          {items.map((item, i) => (
            <details key={i} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium text-ink">
                <span>{item.q}</span>
                <span aria-hidden className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-paper-edge text-ink-muted transition group-open:rotate-45 group-open:border-terracotta group-open:text-terracotta">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 21.4: Commit**

```bash
git add apps/web/components/landing/faq.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): add FAQ section (8 Q/A, native <details> accordion)"
```

---

## Task 22: CTAFinal section

**Files:**
- Create: `apps/web/components/landing/cta-final.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 22.1: Add `ctaFinal` namespace to fr.json**

```json
    "ctaFinal": {
      "title": "Prête à essayer Klasso dans votre école ?",
      "subtitle": "Démo gratuite 30 minutes. Sans engagement.",
      "ctaPrimary": "Demander une démo →",
      "ctaSecondary": "Se connecter"
    },
```

- [ ] **Step 22.2: Add same to ar.json**

```json
    "ctaFinal": {
      "title": "هل أنت مستعد لتجربة كلاسو في مدرستك؟",
      "subtitle": "عرض توضيحي مجاني 30 دقيقة. دون التزام.",
      "ctaPrimary": "اطلب عرضاً ←",
      "ctaSecondary": "تسجيل الدخول"
    },
```

- [ ] **Step 22.3: Implement CtaFinal**

Create `apps/web/components/landing/cta-final.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import type { Route } from 'next';

import { Link } from '@/i18n/routing';
import { ZelligePattern } from './atoms/zellige-pattern';

export function CtaFinal() {
  const t = useTranslations('landing.ctaFinal');
  return (
    <section className="relative isolate overflow-hidden bg-paper-alt">
      <ZelligePattern opacity={0.1} />
      <div className="container relative z-10 mx-auto px-4 py-20 text-center sm:py-28">
        <h2 className="mx-auto max-w-3xl font-display text-3xl font-medium tracking-tight text-ink sm:text-5xl">{t('title')}</h2>
        <p className="mt-5 text-lg text-ink-muted">{t('subtitle')}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href={'#demo-form' as Route} className="inline-flex h-12 items-center justify-center rounded-md bg-terracotta px-8 text-base font-medium text-paper shadow-lg transition hover:bg-terracotta-dark">
            {t('ctaPrimary')}
          </Link>
          <Link href={'/login' as Route} className="inline-flex h-12 items-center justify-center rounded-md border border-paper-edge bg-paper px-8 text-base font-medium text-ink transition hover:bg-paper-alt">
            {t('ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 22.4: Commit**

```bash
git add apps/web/components/landing/cta-final.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): add CTAFinal section (zellige pattern bg + dual CTA)"
```

---

## Task 24: Footer — "Chapitre" indicators

**Files:**
- Modify: `apps/web/components/landing/footer.tsx`
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 24.1: Replace `footer` block in fr.json**

```json
    "footer": {
      "tagline": "L'école à l'ère numérique",
      "chapters": {
        "title": "Chapitres",
        "items": [
          { "label": "Chapitre I — Élèves", "status": "Disponible" },
          { "label": "Chapitre II — Parents", "status": "Été 2026" },
          { "label": "Chapitre III — Enseignants", "status": "Été 2026" },
          { "label": "Chapitre IV — Finance", "status": "Automne 2026" }
        ]
      },
      "links": {
        "product": "Produit",
        "pricing": "Tarifs",
        "modules": "Modules",
        "faq": "FAQ",
        "contact": "Contact",
        "legal": "Légal",
        "terms": "Mentions légales",
        "privacy": "Politique RGPD"
      },
      "language": "Langue",
      "address": "ESS Klasso, Tunis · contact@klasso.tn",
      "edition": "Édition v0.5.0",
      "copyright": "© {year} Klasso — Tous droits réservés"
    }
```

- [ ] **Step 24.2: Replace `footer` block in ar.json**

```json
    "footer": {
      "tagline": "المدرسة في عصر رقمي",
      "chapters": {
        "title": "الفصول",
        "items": [
          { "label": "الفصل الأول — التلاميذ", "status": "متوفّر" },
          { "label": "الفصل الثاني — الأولياء", "status": "صيف 2026" },
          { "label": "الفصل الثالث — المعلمون", "status": "صيف 2026" },
          { "label": "الفصل الرابع — المالية", "status": "خريف 2026" }
        ]
      },
      "links": {
        "product": "المنتج",
        "pricing": "الأسعار",
        "modules": "الوحدات",
        "faq": "الأسئلة",
        "contact": "اتصل بنا",
        "legal": "قانوني",
        "terms": "إشعار قانوني",
        "privacy": "سياسة RGPD"
      },
      "language": "اللغة",
      "address": "ESS Klasso, تونس · contact@klasso.tn",
      "edition": "النسخة v0.5.0",
      "copyright": "© {year} كلاسو — جميع الحقوق محفوظة"
    }
```

- [ ] **Step 24.3: Replace footer.tsx**

```tsx
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from './language-switcher';

interface Chapter { label: string; status: string; }

export function Footer() {
  const t = useTranslations('landing.footer');
  const chapters = t.raw('chapters.items') as Chapter[];
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-paper-edge bg-paper-alt">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">Klasso</p>
            <p className="mt-2 text-sm text-ink-muted">{t('tagline')}</p>
            <p className="mt-6 text-xs text-ink-faded">{t('address')}</p>
            <p className="mt-1 font-mono text-xs text-ink-faded">{t('edition')}</p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">{t('chapters.title')}</h3>
            <ul className="mt-4 space-y-2">
              {chapters.map((c, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-ink-muted">{c.label}</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-faded">{c.status}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink">{t('language')}</h3>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <p className="mt-12 border-t border-paper-edge pt-6 text-xs text-ink-faded">
          {t('copyright', { year })}
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 24.4: Commit**

```bash
git add apps/web/components/landing/footer.tsx apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(landing): upgrade Footer with Chapitre indicators + dynamic year"
```

---

# Phase P8 — Images + i18n verify + ADR + PR (~1.1j)

## Task 23: Source and add Unsplash CC0 photos

**Files:**
- Create: `apps/web/public/landing/hero.webp`
- Create: `apps/web/public/landing/trust-book.webp`

- [ ] **Step 23.1: Download hero photo from Unsplash**

Source pool (verified CC0 commercial use, Unsplash license):
- Primary: `https://unsplash.com/photos/girl-in-yellow-and-black-school-uniform-FHnnjk1Yj7Y` (Aaron Burden — children reading, warm light)
- Backup: search `https://unsplash.com/s/photos/moroccan-school` filter "Free to use" → pick a classroom photo

Download as JPG at width 1920px from the Unsplash UI. Convert to WebP via `cwebp` (or use Squoosh CLI):

```bash
cwebp -q 82 -resize 1920 0 ~/Downloads/hero-source.jpg -o apps/web/public/landing/hero.webp
```

Verify file size ≤ 150 KB (`ls -lh apps/web/public/landing/hero.webp`). If larger, retry with `-q 78`.

- [ ] **Step 23.2: Download trust accent photo**

Source pool:
- Primary: open-book or writing photo from Unsplash (search `https://unsplash.com/s/photos/open-book`)

```bash
cwebp -q 82 -resize 1280 0 ~/Downloads/trust-source.jpg -o apps/web/public/landing/trust-book.webp
```

- [ ] **Step 23.3: Verify next/image loads photos**

Run: `pnpm --filter=@ecole-saas/web dev` (background)
Open `http://localhost:3000/fr` → Hero photo loads, no 404. Stop dev server.

- [ ] **Step 23.4: Commit photos**

```bash
git add apps/web/public/landing/hero.webp apps/web/public/landing/trust-book.webp
git commit -m "feat(landing): add Unsplash CC0 hero + trust photos (WebP optimized)"
```

---

## Task 25: ADR 0008 + roadmap update

**Files:**
- Create: `docs/adr/0008-landing-tunisian-editorial.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 25.1: Write ADR 0008**

Create `docs/adr/0008-landing-tunisian-editorial.md`:

```markdown
# 0008 — Landing aesthetic direction: Tunisian Editorial

**Date:** 2026-05-26
**Status:** Accepted
**Deciders:** Klasso founding team

## Context

V0 landing (PR #29) shipped a functional but visually generic landing page (Inter font, neutral palette, no photos, no animations). User feedback compared it unfavorably to `ecole-saas.vercel.app` (Klasio Côte d'Ivoire) which has photos, segments, dashboard mockup, and FAQ.

We need a distinctive aesthetic direction that:
- Stands apart from "purple gradient + Inter" SaaS template aesthetics
- Resonates with Tunisian school directors (the buyer persona)
- Honors bilingual FR/AR identity as a feature, not a retrofit
- Stays production-grade (≤ 3.5j effort, Lighthouse mobile ≥ 90)

## Decision

Adopt "Tunisian Editorial" — a pedagogical-heritage aesthetic referencing Le Monde Diplomatique authority, Apple News+ editorial restraint, and Maktaba Online's modern Arabic sobriety.

**Locked decisions:**

1. **Palette OKLCH**: terracotta primary (`oklch(0.58 0.16 38)`), warm cream paper background (`oklch(0.97 0.012 75)`), Mediterranean deep teal for Pricing featured (`oklch(0.40 0.06 195)`), saharan ochre for badges, olive for trust/success, dusty rose for AR accents.
2. **Typography**: Fraunces (display, variable OPSZ+SOFT axes), Public Sans (body), JetBrains Mono (numerals), Markazi Text (AR display), IBM Plex Sans Arabic (AR body). All via `next/font/google`.
3. **Numerals**: western `0123456789` everywhere — including AR locale. We do NOT use `Intl.NumberFormat('ar-TN')` (which produces `٠١٢٣...`). Rationale: urban Tunisian bilingual practice uses Latin digits everywhere (bills, banking, pricing); universality > strict editorial purism; Klasio (the reference site) uses the same approach.
4. **Photos**: Unsplash CC0 only, Tunisia/Maghreb-specific search terms (not "Africa generic"), duotone treatment via CSS filters (`sepia(0.25) contrast(1.05) saturate(0.75)`) + multiply blend with terracotta/teal gradient. NO Storyset/unDraw illustrations.
5. **Animations**: One signature moment (hero word-by-word reveal via `motion`), CSS-only scroll reveals (`animation-timeline: view()` with IntersectionObserver fallback), rAF KPI counters. `motion ^12` is the only added animation dep (~12 KB gzip). NO Lottie, NO GSAP, NO AOS.
6. **Layout**: 12 sections (Hero, Stats, SchoolSegments, Benefits, DashboardMockup, ModulesGrid, Trust, Pricing, FAQ, CTAFinal, DemoForm, Footer). Outclasses Klasio's 9 sections by adding DashboardMockup + FAQ + CTAFinal.
7. **Tenant white-label boundary**: Landing is opinionatedly Klasso-branded (terracotta hardcoded). Tenant `--primary` brand override only applies inside `(app)/*` routes after login. The public landing sells *Klasso*, not your school.

## Consequences

**Positive:**
- Distinctive look competitors won't ship by copying templates.
- Bilingual identity becomes a sales asset (the bilingual hero subtitle moment).
- Editorial restraint signals B2B institutional seriousness (vs. "consumer edtech").
- All decisions reversible — palette is OKLCH CSS vars, fonts via `next/font`, animations behind `prefers-reduced-motion`.

**Negative / trade-offs:**
- Added font bundle (~80 KB across 5 fonts) — mitigated by `next/font` subsetting + `display: swap`.
- Added `motion` dep (~12 KB gzip). Accepted because it powers the single signature reveal.
- Markazi Text + IBM Plex Sans Arabic require AR subset — slightly slower first AR page load (mitigated by preload on AR routes only).

## Alternatives considered

- **Stripe/Linear template**: rejected (generic, indistinguishable from competitors).
- **Storyset illustrations**: rejected (too juvenile for B2B school directors).
- **Lottie animations**: rejected (overkill for institutional B2B, heavy bundle).
- **Arabic-Indic numerals (`٢٤٧`)**: rejected (see D26 numerals decision above).
- **Photos of real Tunisian schools**: rejected for V0.5 — zero customers means no permission to use real schools. Revisit V0.7 when we have signed references.

## References

- Spec: `docs/superpowers/specs/2026-05-26-landing-ux-upgrade.md`
- Plan: `docs/superpowers/plans/2026-05-26-landing-ux-upgrade.md`
- Klasio reference: `https://ecole-saas.vercel.app/`
```

- [ ] **Step 25.2: Append V0.5 entry to roadmap.md**

In `docs/roadmap.md`, locate the V0 entry (Landing klasso.tn shipped). Append immediately below:

```markdown
### V0.5 — Landing UX upgrade "Tunisian Editorial" (2026-05-26 → 2026-05-29)

Polished landing for commercial launch:
- Palette OKLCH (terracotta + cream + deep teal)
- Typography Fraunces + Public Sans + Markazi Text + IBM Plex Sans Arabic
- 5 new sections (Stats, SchoolSegments, DashboardMockup, FAQ, CTAFinal)
- Unsplash CC0 photos with duotone treatment
- Scroll reveal animations (CSS animation-timeline + IO fallback)
- ADR 0008 documents direction

D26 lock: western numerals everywhere (even AR locale).
```

- [ ] **Step 25.3: Commit**

```bash
git add docs/adr/0008-landing-tunisian-editorial.md docs/roadmap.md
git commit -m "docs: ADR 0008 — Tunisian Editorial landing direction + roadmap V0.5 entry"
```

---

## Task 26: Playwright e2e — landing FR + AR smoke

**Files:**
- Create: `apps/web/e2e/landing-ux.spec.ts`

- [ ] **Step 26.1: Implement landing smoke test**

Create `apps/web/e2e/landing-ux.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Landing V0.5 — UX upgrade smoke', () => {
  test('FR locale renders all 12 sections and key content', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Conformité RGPD')).toBeVisible();
    await expect(page.getByText("Jardins d'enfants")).toBeVisible();
    await expect(page.getByText('Écoles primaires')).toBeVisible();
    await expect(page.getByText('Gain de temps')).toBeVisible();
    await expect(page.getByText('Migration depuis Excel')).toBeVisible();
    await expect(page.getByText('Mme Hadia')).toBeVisible();
    await expect(page.getByText('Questions fréquentes')).toBeVisible();
    await expect(page.getByText('Prête à essayer Klasso')).toBeVisible();
    await expect(page.getByText('Chapitre I — Élèves')).toBeVisible();
  });

  test('AR locale renders with RTL direction', async ({ page }) => {
    await page.goto('/ar');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('رياض الأطفال')).toBeVisible();
    await expect(page.getByText('أسئلة شائعة')).toBeVisible();
  });

  test('CTA primary scrolls to demo form anchor', async ({ page }) => {
    await page.goto('/fr');
    const ctaLink = page.getByRole('link', { name: /Demander une démo gratuite/ }).first();
    await ctaLink.click();
    await expect(page).toHaveURL(/#demo-form$/);
  });
});
```

- [ ] **Step 26.2: Run the e2e suite (after a build)**

Run: `pnpm --filter=@ecole-saas/web build && pnpm --filter=@ecole-saas/web e2e`
Expected: PASS (3 tests). If a test fails, fix the implementation in the relevant section component — not the test (unless the test asserts something wrong).

- [ ] **Step 26.3: Commit**

```bash
git add apps/web/e2e/landing-ux.spec.ts
git commit -m "test(landing): add Playwright smoke tests for V0.5 FR + AR + CTA anchor"
```

---

## Task 27: Final smoke + open PR

- [ ] **Step 27.1: Full local CI rehearsal**

Run in sequence:

```bash
pnpm lint
pnpm type-check
pnpm build
pnpm test
```

Expected: ALL PASS. If any fail, fix the issue and add a fix commit on this branch.

- [ ] **Step 27.2: Push the branch**

```bash
git push -u origin feat/landing-ux-upgrade
```

- [ ] **Step 27.3: Open PR**

```bash
gh pr create --base main --head feat/landing-ux-upgrade --title "feat(landing): V0.5 Tunisian Editorial UX upgrade" --body "$(cat <<'EOF'
## Summary

V0.5 upgrade of the Klasso landing page per spec `docs/superpowers/specs/2026-05-26-landing-ux-upgrade.md` and ADR 0008.

- New aesthetic: **Tunisian Editorial** (terracotta + cream paper + deep teal)
- 5 new sections: Stats, SchoolSegments, DashboardMockup, FAQ, CTAFinal
- 6 reusable atoms: DropCap, ScrollReveal, CountUp, DeckleEdge, ZelligePattern, Section
- Typography: Fraunces (display) + Public Sans (body) + JetBrains Mono (numerals) + Markazi Text + IBM Plex Sans Arabic
- Unsplash CC0 hero photo with duotone treatment
- `motion ^12` for hero word-by-word reveal (signature animation)
- All bilingual FR/AR with native RTL composition

## Locked decisions (ADR 0008)

- Numerals stay **western** even in AR locale (no `Intl.NumberFormat('ar-TN')`)
- Public landing is hardcoded Klasso-branded (terracotta); tenant white-label only applies inside `(app)/*`
- No Lottie / no GSAP / no Storyset illustrations

## Test plan

- [ ] CI lint + type-check + build pass green
- [ ] CI API tests pass green (no backend changes — should be unaffected)
- [ ] CI Web e2e (Playwright) — new `landing-ux.spec.ts` runs FR + AR + CTA anchor
- [ ] Vercel preview deploys
- [ ] Verify on preview: Hero photo loads (terracotta/teal duotone)
- [ ] Verify on preview: `/fr` and `/ar` both render all 12 sections
- [ ] Verify on preview: Pricing card "Standard" has deckle edge + ochre badge
- [ ] Verify on preview: FAQ accordion expands/collapses (no JS, native `<details>`)
- [ ] Verify on preview: `prefers-reduced-motion` opt-out skips animations
- [ ] Lighthouse mobile ≥ 90 Performance, LCP < 2.5s

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 27.4: Monitor CI**

Run: `gh pr checks --watch`
Expected: All checks turn green.

- [ ] **Step 27.5: Auto-merge per CLAUDE.md règle 9**

When all CI checks pass:

```bash
gh pr merge --merge
```

(CLAUDE.md §"Workflow par vague" règle 9, politique locked 2026-05-22 : CI verte → merge automatique, stratégie merge commit, sans attendre d'OK explicite.)

- [ ] **Step 27.6: Verify main is updated**

```bash
git fetch origin main
git log origin/main --oneline -3
```

Expected: top commit is the merge of `feat/landing-ux-upgrade` into `main`.

---

# Self-Review

## 1. Spec coverage check

| Spec section | Tasks implementing it |
|---|---|
| §2.2 Palette OKLCH | Task 1 (Tailwind), Task 3 (CSS vars) |
| §2.3 Typography (5 fonts) | Task 1 (fontFamily), Task 2 (next/font loading) |
| §2.4 Spatial system | Task 10 (Section wrapper) |
| §2.5 Texture & atmosphere | Task 3 (.paper-grain), Task 8 (DeckleEdge), Task 9 (ZelligePattern) |
| §2.6 Motion philosophy | Task 4 (motion dep), Task 6 (ScrollReveal), Task 7 (CountUp), Task 3 (reduced motion), Task 12 (Hero reveal) |
| §3.1 Hero upgrade | Task 12 |
| §3.2 Stats new | Task 13 |
| §3.3 SchoolSegments new | Task 14 |
| §3.4 Benefits 6 piliers | Task 15 |
| §3.5 DashboardMockup new | Task 16 |
| §3.6 ModulesGrid refresh | Task 17 |
| §3.7 Trust micro-proof | Task 18 |
| §3.8 Pricing deckle + ochre | Task 19 |
| §3.9 FAQ new | Task 21 |
| §3.10 CTAFinal new | Task 22 |
| §3.11 DemoForm success polish | Task 20 |
| §3.12 Footer Chapitre | Task 24 |
| §4 UX-Copy improvements | Tasks 12, 13, 14, 15, 16, 18, 21, 22, 24 (all i18n updates) |
| §5 Image strategy | Task 23 |
| §6 Animation strategy | Tasks 4, 6, 7, 12 |
| §7 AR/RTL specificities | Task 12 (Hero mirror), Task 19 (Pricing translate-x), Task 24 (Footer), Task 26 (RTL e2e) |
| §7.4 Numerals decision | Task 7 (CountUp uses no Intl), Task 25 (ADR locks decision) |
| §10 Acceptance criteria | Task 27 PR test plan |

No coverage gaps.

## 2. Placeholder scan

Scanned for: TBD, TODO (in code), "implement later", "etc.", vague "add appropriate".
- Task 20 step 20.1 uses a Read-then-Edit instruction because the existing demo-form.tsx has variable internal structure — the replacement markup IS provided in step 20.2, and the optional `requestId` rendering is gated on its existence. Acceptable.
- No other placeholders.

## 3. Type consistency

- Component names (`Section`, `DropCap`, `ScrollReveal`, `CountUp`, `DeckleEdge`, `ZelligePattern`, `Hero`, `Stats`, `SchoolSegments`, `Benefits`, `DashboardMockup`, `ModulesGrid`, `Trust`, `Pricing`, `Faq`, `CtaFinal`, `DemoForm`, `Footer`) — used consistently across all import statements (Task 11) and definitions (Tasks 5-22).
- Tailwind tokens (`paper`, `paper-alt`, `paper-edge`, `ink`, `ink-muted`, `ink-faded`, `terracotta`, `terracotta-dark`, `ochre`, `teal-deep`, `olive`, `rose-dust`) — consistent between Task 1 and component usage.
- Font family classes (`font-display`, `font-sans`, `font-mono`, `font-display-ar`, `font-sans-ar`) — consistent.
- CSS var names (`--paper`, `--ink`, `--terracotta`, `--terracotta-2`, etc.) — consistent between Task 3 declaration and Task 1 Tailwind references.
- i18n keys (`landing.hero.*`, `landing.stats.*`, `landing.schoolSegments.*`, `landing.benefits.*`, `landing.dashboardMockup.*`, `landing.trust.*`, `landing.pricing.*`, `landing.faq.*`, `landing.ctaFinal.*`, `landing.demoForm.*`, `landing.footer.*`) — every component's `useTranslations('landing.X')` matches a namespace added in fr.json + ar.json.
- Task numbering: 1-22 sequential then 24 (Task 23 is photos in P8, Footer is renumbered Task 24 — confirmed by File Structure header). No duplicates.

All consistent.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-26-landing-ux-upgrade.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task + two-stage review (spec + code quality).

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch with checkpoints.

**Which approach?**
