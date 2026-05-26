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
3. **Numerals — D26**: western `0123456789` everywhere — including AR locale. We do NOT use `Intl.NumberFormat('ar-TN')` (which produces `٠١٢٣...`). Rationale: urban Tunisian bilingual practice uses Latin digits everywhere (bills, banking, pricing); universality > strict editorial purism; Klasio (the reference site) uses the same approach.
4. **Photos**: Unsplash CC0 only, Tunisia/Maghreb-specific search terms (not "Africa generic"), duotone treatment via CSS filters (`sepia(0.25) contrast(1.05) saturate(0.75)`) + multiply blend with terracotta/teal gradient. NO Storyset/unDraw illustrations. V0.5 ships a stylized SVG placeholder (`/landing/hero.svg`) until photos are sourced — see roadmap V0.7.
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
- Hero photo is a stylized SVG placeholder for V0.5 (no real photos yet) — accepted as a soft landing until V0.7 sources Unsplash CC0 photos.

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
