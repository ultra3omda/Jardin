# Klasso Landing — UX/UI Upgrade Spec (v0.5)

**Date** : 2026-05-26
**Statut** : Brouillon à valider
**Référence comparative** : `https://ecole-saas.vercel.app/` (Klasio, Côte d'Ivoire)
**Branche d'implémentation** : `feat/landing-ux-upgrade` (depuis main post-merge PR #29)

---

## 0. TL;DR

La landing V0 actuelle (PR #29) couvre la **structure** (Hero, Bénéfices, Modules, Trust, Pricing, Form, Footer) mais reste **muette esthétiquement** : pas d'images, pas d'animations, pas de signature visuelle. Elle ressemble à 10 000 autres landings SaaS.

Cette spec définit un upgrade qui :

1. **Adopte un axe esthétique distinctif** : *Tunisian Editorial — pedagogical heritage*. Couleurs terre + crème + sarcelle profonde, typographie variable Fraunces (display) + Public Sans (body) + Markazi Text + IBM Plex Sans Arabic.
2. **Ajoute 4 nouvelles sections** : segments d'écoles, dashboard mockup, 6 piliers étendus, FAQ.
3. **Introduit photos curées** (Tunisie/Maghreb spécifiquement, pas "Africa générique") + traitement duotone.
4. **Anime intentionnellement** : 1 signature moment (hero reveal lettre-par-lettre) + scroll-reveal CSS-only + 3 micro-interactions Framer Motion.
5. **Honore l'AR/RTL** comme un *feature*, pas un retrofit : compositions miroir, bilingue parfois côte-à-côte, typo arabe éditoriale (Markazi Text).
6. **Reste production-grade** : Vercel preview deploy en moins de 2j d'effort, Lighthouse mobile ≥ 90, Core Web Vitals optimisés.

---

## 1. Critique de la landing actuelle (PR #29)

| Aspect | État actuel | Verdict |
|---|---|---|
| **Hero** | Tagline + 2 CTA centrés sur fond gradient `from-background to-muted/30` | ❌ Aucune image, aucune atmosphère, ressemble à un template `create-next-app` |
| **Bénéfices** | 3 cards icône + titre + description | 🟡 Honnête mais sous-vendu — Klasio en a 6, plus impactants |
| **Modules** | Grid 6 modules badges status | 🟢 Différenciant (montre roadmap honnêtement) — à garder |
| **Trust** | 4 trust signals RGPD/hosting/support/updates | 🟡 Trop abstrait — manque preuves visuelles |
| **Pricing** | 3 tiers, Standard featured | 🟢 OK structure — à enrichir visuellement (border, badge "le plus populaire" mieux mis en scène) |
| **DemoForm** | RHF + Turnstile, 7 champs | 🟢 OK fonctionnel — à dorer (state success plus émotionnel) |
| **Footer** | 4 colonnes + LanguageSwitcher | 🟡 Plat — ajouter copyright année dynamique + adresse + numéro tel pro |
| **Typo** | Inter (default Next.js + V1.5 setup) | ❌ Générique. Inter est le "Times New Roman" du SaaS 2024 |
| **Couleurs** | Tenant `--primary` (souvent défaut shadcn neutral) | ❌ Aucune identité Klasso propre |
| **Images** | Aucune | ❌ La page parle de "votre école" sans en montrer une seule |
| **Animations** | Aucune | ❌ Page statique = page "morte" |
| **Sections manquantes** | Pas de FAQ, pas de dashboard preview, pas de segments d'écoles, pas de CTA final | ❌ Visiteur reste sur sa faim |

**Verdict global** : V0 fonctionnel ✅ mais V0 *commercial* ❌. Une école qui visite ne se projette pas. Ressemble à une démo technique.

---

## 2. Axe esthétique — "Tunisian Editorial"

### 2.1 Direction & inspiration

Inspirations de référence (PAS à copier — à informer) :

- **Le Monde Diplomatique** : autorité éditoriale, typo serif, mise en page magazine
- **Wagner & Wagner-style architecture journals** : grilles brisées, photos pleines page
- **Apple News+ / Editorial Bookshops** : drop caps, espaces blancs cultivés
- **Maktaba Online (Tunis)** : sobriété arabe éditoriale moderne
- **Frieze magazine** : asymétrie discrète, hiérarchies confiantes

**ANTI-références** (à éviter) :
- Stripe / Vercel / Linear (purple gradients + Inter — l'esthétique générique du SaaS moderne)
- Storyset / unDraw illustrations (= ton "early-stage startup" qu'on ne veut PAS pour des directeurs d'école)
- Lottie animations enfantines (= ton "edtech consumer" qu'on ne veut PAS pour B2B institutionnel)

### 2.2 Palette — earth + cream + deep teal

```css
:root {
  /* Backgrounds */
  --paper:        oklch(0.97 0.012 75);    /* #FAF6F0 — warm cream paper */
  --paper-2:      oklch(0.94 0.018 75);    /* #F2EBDF — slightly darker cream for alt sections */
  --paper-edge:   oklch(0.88 0.025 70);    /* #DDD0BB — for borders, divider lines */

  /* Inks (text) */
  --ink:          oklch(0.20 0.018 60);    /* #1A1612 — deep warm black */
  --ink-2:        oklch(0.45 0.025 65);    /* #6B5F52 — muted earth brown */
  --ink-mute:     oklch(0.60 0.018 70);    /* #968878 — faded ink */

  /* Accents */
  --terracotta:   oklch(0.58 0.16 38);     /* #C4622B — Tunisian clay (PRIMARY brand) */
  --terracotta-2: oklch(0.50 0.18 35);     /* #A04C1C — darker hover state */
  --ochre:        oklch(0.75 0.12 75);     /* #D4A859 — saharan ochre (secondary, badges) */
  --teal-deep:    oklch(0.40 0.06 195);    /* #1F4A4A — Mediterranean deep teal (Standard pricing) */
  --olive:        oklch(0.52 0.08 115);    /* #6B7B3F — olive (trust/success) */
  --rose-dust:    oklch(0.72 0.08 30);     /* #C08B7C — dusty rose (AR accents) */

  /* Functional */
  --success:      var(--olive);
  --warning:      var(--ochre);
  --danger:       oklch(0.50 0.15 25);     /* #A6452A — burnt sienna */
}
```

**Tenant compatibility** : V1.6 white-label runtime injects `--primary` and `--primary-foreground`. We map :
- `--primary` defaults to `--terracotta` if tenant has no brand
- Landing components use BOTH `--terracotta` (default Klasso aesthetic) AND `--primary` (tenant-aware moments — none on public landing, all on `(app)/*` pages)

→ Landing is **opinionatedly Klasso-branded** (terracotta). Tenant override only applies once logged in. This is intentional : public landing sells *Klasso*, not your school.

### 2.3 Typography

| Role | Font | Weight | Source |
|---|---|---|---|
| **Display FR** (h1, h2 hero) | **Fraunces** (variable: OPSZ 144, SOFT 50–100) | 300–700 | Google Fonts, free, OFL |
| **Body FR** | **Public Sans** (variable) | 300–700 | Google Fonts, free, OFL (USWDS pedigree) |
| **Mono / numerals** (pricing, KPIs) | **JetBrains Mono** | 400, 600 | Google Fonts, free, OFL |
| **Display AR** (h1, h2 hero) | **Markazi Text** | 400–700 | Google Fonts, free, OFL (editorial Arabic serif) |
| **Body AR** | **IBM Plex Sans Arabic** | 400–600 | Google Fonts, free, OFL (institutional feel) |

**Why these choices** :
- **Fraunces** : a serif with variable `SOFT` axis. At display sizes (≥48px), increase SOFT for warmth/pulpiness; at body sizes (≤16px), reduce SOFT for crispness. Distinctive *not* Inter.
- **Public Sans** : designed for US Web Design System — feels official, institutional, slightly more humanist than Inter. Pair well with Fraunces.
- **JetBrains Mono** : for `5 TND/élève/mois` pricing displays (mono-numeric, signals precision). Also for KPI counters in dashboard mockup.
- **Markazi Text** : a beautiful free editorial Arabic serif. Pairs with Fraunces because both have humanist warmth.
- **IBM Plex Sans Arabic** : institutional, very readable, matches Public Sans contextual presence.

**NO Inter, NO Roboto, NO Space Grotesk.**

### 2.4 Spatial system

- **Grid** : 12 columns, gutter 24px, max-width 1240px container
- **Asymmetric breaks** : sections alternate full-bleed (Hero, Dashboard mockup, CTA final) and constrained columns (Benefits, Pricing, FAQ)
- **Vertical rhythm** : sections at 96–128px padding-top/bottom on desktop; 64px on mobile
- **Whitespace ratio** : ~60% white space, 40% content (Klasio is ~50/50 — we breathe more)
- **Drop caps** : First paragraph of each major section (Benefits intro, Trust intro) starts with a 56px Fraunces italic drop cap

### 2.5 Texture & atmosphere

- **Paper grain** : subtle SVG noise overlay on `--paper` background (5% opacity, 0.4px noise scale)
- **Zellige-inspired geometric watermark** : a SINGLE SVG pattern (derived from 8-pointed Maghrebi star, not literal photo of tiles) repeated subtly as section divider OR as low-opacity background on Trust section. Custom-designed by us, not stock.
- **Deckle edges** : pricing featured card has a faint hand-cut SVG edge (lithographic feel) on top border
- **Soft rules** : 1px dividers with SVG-filtered chalk texture (gives institutional document feel)
- **NO Z-axis gradients** (the SaaS-2024 trope of soft purple→blue gradients)

### 2.6 Motion philosophy

**Hierarchy of motion** (from impactful to ambient) :

1. **Signature moment** (1 only) : Hero headline reveals word-by-word on page load, with each word fading in from a slight `translate-y: 12px` over 80ms-staggered timeline (FR: word reveal; AR: respecting RTL reading direction)
2. **Scroll-triggered** : Section entries use CSS `animation-timeline: view()` where supported (modern browsers), fallback to IntersectionObserver triggering `data-reveal="true"` attribute that drives CSS transition
3. **Hover micro-interactions** : Pricing cards lift 6px + shadow intensifies; module cards rotate icon 5° on hover; CTA buttons pull terracotta-2 darker, no scale
4. **KPI counter animation** : Dashboard mockup KPIs animate from 0 to value once 50% in viewport, using `requestAnimationFrame` (no Framer for this — too heavy)
5. **Language switcher** : When pressed, the `<html dir>` change triggers a 200ms cross-fade of the body (Framer Motion presence)

**Library choice** :
- **CSS-only** : scroll reveals, hover lifts, drop caps
- **Framer Motion (named `motion`)** : ONLY for hero headline reveal + LanguageSwitcher cross-fade + dashboard KPI counters. Total bundle impact: ~12KB gzipped, acceptable.

### 2.7 Distinctive signature elements

These are the moments someone *remembers* about Klasso :

1. **Hero "type writer in Arabic ink"** : the headline appears progressively, the cursor blink uses a small inkwell SVG (the Tunisian dawayya) — surprising touch for AR locale
2. **Drop caps on section intros** : Fraunces italic, 56px, terracotta — feels like a textbook
3. **Dashboard mockup with synthetic "École Primaire Sidi Bou Saïd"** data — fictional school using a real Tunisian neighborhood, no risk of stealing real client data, but feels grounded
4. **"Chapitre" indicators** in footer : `Chapitre I — Élèves · Chapitre II — Parents (été 2026) ...` — extends the editorial metaphor
5. **AR/FR side-by-side moment** : Hero subtitle shows BOTH languages stacked (FR primary, AR smaller below in Markazi Text) — a quiet manifesto for the bilingual identity

---

## 3. New section layout (FINAL composition)

Ordre proposé pour `app/[locale]/page.tsx` :

```
01. <Hero />                     ← upgraded (photo + reveal + bilingual subtitle)
02. <Stats />                    ← NEW (3 stats sans clients : "100% RGPD" / "4 modules en roadmap" / "Bilingue FR/AR")
03. <SchoolSegments />           ← NEW (3 cards: Maternelle / Primaire / Mixte, mapped to TenantType)
04. <Benefits />                 ← upgraded (3 → 6 piliers, with drop cap intro paragraph)
05. <DashboardMockup />          ← NEW (React component with synthetic Sidi Bou Saïd data + animated KPIs)
06. <ModulesGrid />              ← upgraded (refined cards, ochre badges instead of plain emerald/amber)
07. <Trust />                    ← upgraded (4 → 4 with proof points: certif RGPD, Neon/Vercel logos, support hours)
08. <Pricing />                  ← upgraded (deckle edge featured card, "Le plus populaire" ochre badge prominent)
09. <FAQ />                      ← NEW (8 Q/A, accordion CSS-only)
10. <CTAFinal />                 ← NEW (full-bleed band with double CTA: démo primaire + login secondaire)
11. <DemoForm />                 ← upgraded (success state with emotional payoff, illustrated icon)
12. <Footer />                   ← upgraded (chapitre indicators, contact pro, copyright dynamique)
```

12 sections au total. Compared to Klasio's 9. We **outclass** them by adding `Stats`, `DashboardMockup`, `SchoolSegments`, `FAQ`, `CTAFinal` while keeping Modules grid (which Klasio doesn't have — our roadmap honesty is a feature).

### 3.1 Hero (upgraded)

```
┌──────────────────────────────────────────────────────────────┐
│   [Paper grain overlay 5%]                                   │
│                                                              │
│   L'école à l'ère numérique         [Photo treated duotone:  │
│   ─ sans complexité ─                Tunisian classroom,     │
│                                      gold-hour light]        │
│   المدرسة في عصر رقمي                                       │
│   (Markazi Text, smaller, ink-2 color)                       │
│                                                              │
│   La plateforme SaaS pensée pour les écoles tunisiennes —    │
│   élèves, parents, enseignants, finances.                    │
│                                                              │
│   [Demander une démo gratuite]  →  Se connecter              │
│   (terracotta filled)              (ghost button)            │
│                                                              │
│   ↓ trust scrollers : "Hébergement EU + TN · RGPD-ready ·    │
│     Support FR/AR · Sans engagement"                         │
└──────────────────────────────────────────────────────────────┘
```

**Implementation notes** :
- Hero photo : Unsplash CC0 of children with books / Tunisian classroom — duotone via CSS `filter` + terracotta overlay
- Reveal animation : `motion.h1` with `<motion.span>` per word, staggered 80ms
- AR subtitle : Markazi Text 24px, `--ink-2` color, intentionally smaller — speaks to the bilingual identity without competing with FR display

### 3.2 Stats (NEW — social proof without clients)

3 stats horizontaux qui ne mentent pas (zéro client) :

```
100%               4                2 × 2
(JetBrains Mono)   (JetBrains Mono)
Conformité RGPD    Modules en       Bilingue
& isolation        roadmap 2026     FR · العربية
multi-tenant                        Web · Mobile
```

Honnêteté > faux nombres. Le `2 × 2` est conceptuel (FR/AR × Web/Mobile) — c'est mémorable.

### 3.3 SchoolSegments (NEW)

3 cards mappés EXACTEMENT sur `TenantType` enum :

| TenantType | FR | Description courte |
|---|---|---|
| `KINDERGARTEN` | **Jardins d'enfants** (Maternelle, 3–5 ans) | Inscription souple, adapté aux rythmes courts |
| `PRIMARY_SCHOOL` | **Écoles primaires** (CP → CM2, 6–11 ans) | Suivi pédagogique, bulletins, carnets de correspondance |
| `MIXED` | **Établissements mixtes** (maternelle + primaire) | Vue d'ensemble consolidée pour groupes scolaires |

Visual continuity from landing → product : ces 3 types sont aussi ce que sélectionne le super-admin dans `/admin/tenants/new`.

Icons : pas d'emoji ! Custom SVG line icons (Lucide-style mais redessinés Maghreb-inspired) : a stylized seedling, an open book with crescent moon decoration, two buildings stacked.

### 3.4 Benefits — 6 piliers (upgraded from 3)

Section format : drop cap intro paragraph + 2×3 grid of pillars.

> **« P** lus de bouts de papier, plus de tableaux Excel oubliés sur clé USB. Klasso rend visible ce qui était dispersé, automatique ce qui était répétitif, et collaboratif ce qui était silencieux. »

Then grid :

| Icon | Pilier FR | Description courte |
|---|---|---|
| ⏱ | **Gain de temps** | Les tâches répétitives (appels, présences, bulletins) en quelques clics |
| 🌿 | **Zéro papier** | Toutes les fiches élèves et bulletins en ligne. Économie réelle, geste réel |
| 📱 | **Mobile-first parents** | Les parents voient les infos sur leur téléphone, même hors-ligne (V3) |
| 🛡 | **RGPD européen** | Isolation multi-tenant testée, audit logs, export et droit à l'oubli |
| 🗣 | **Support en français et arabe** | Notre équipe répond en moins de 24h ouvrées, dans votre langue |
| 📥 | **Migration depuis Excel** | Import CSV en masse. Vos données existantes, intactes, en 1 clic |

(Final design replaces emoji with custom-styled Lucide icons.)

### 3.5 DashboardMockup (NEW — proof through visualization)

Static React component rendering a fake but credible Klasso dashboard :

```
┌─ Klasso · École Primaire Sidi Bou Saïd ───────────── 🇹🇳 ─┐
│                                                            │
│  Bonjour Mme Hadia 👋                                     │
│                                                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────┐  │
│  │   247     │  │    12     │  │    94%    │  │   3    │  │
│  │  Élèves   │  │  Classes  │  │ Présence  │  │ Alerts │  │
│  │  inscrits │  │   actives │  │ moyenne   │  │        │  │
│  └───────────┘  └───────────┘  └───────────┘  └────────┘  │
│                                                            │
│  Activité récente                                          │
│  → 5 nouveaux élèves inscrits cette semaine                │
│  → Bulletin 2e trimestre disponible le 15 mars             │
│  → 2 absences non justifiées à régulariser                 │
│                                                            │
│  [ Voir tous les élèves →  ]                               │
└────────────────────────────────────────────────────────────┘
```

**Animation** : KPI numbers count from 0 → final value on scroll-into-view (`requestAnimationFrame`, 600ms duration). Subtle.

Behind it : a soft Mediterranean teal `--teal-deep` gradient at 5% opacity gives atmosphere.

### 3.6 ModulesGrid (upgraded)

Garder structure mais :
- Remplacer badges `bg-emerald-100 / bg-amber-100 / bg-gray-100` par notre palette `--olive / --ochre / --paper-edge`
- Icônes Lucide stroke-width 1.5 (au lieu du default 2) pour finesse
- Card hover : icon rotates 5° + lifts 4px

### 3.7 Trust (upgraded)

Garder 4 items mais ajouter sous chaque titre un *micro-proof* :

| Titre | Description | Micro-proof visuel |
|---|---|---|
| RGPD-ready | Isolation multi-tenant... | Petit badge "Conforme RGPD 2026" (custom SVG) |
| Hébergement sécurisé | Serveurs européens... | Logos Neon + Vercel (monochromes en `--ink-2`) |
| Support bilingue | Équipe FR/AR... | "Lun-Ven 9h-17h GMT+1" en caption |
| Mises à jour continues | Nouvelles features... | "Dernière màj : il y a 3 jours" en JetBrains Mono |

### 3.8 Pricing (upgraded)

Structure inchangée mais :
- Card "Standard" : `--teal-deep` border 2px + deckle SVG edge top + `--ochre` badge "Le plus populaire" (au lieu du `--primary` actuel)
- Card "Starter" et "Pro" : `--paper-edge` borders, plus subtiles
- Le prix en `JetBrains Mono` : `5` `4` `3` immédiatement reconnaissables comme données chiffrées
- Hover : lift 6px + shadow expand
- "Features" tick : terracotta `Check` icon (pas vert standard)
- CTA : terracotta filled sur featured, ghost terracotta sur autres

### 3.9 FAQ (NEW)

8 questions :

1. **Combien coûte Klasso pour mon école ?** → Pricing par élève, calcul transparent (renvoie vers section Tarifs)
2. **Comment migrer depuis mes fichiers Excel actuels ?** → Bulk import CSV (V2 — déjà livré)
3. **Les parents peuvent-ils accéder à Klasso ?** → V3 été 2026, app mobile dédiée parents
4. **Mes données restent-elles en Tunisie ?** → Hébergement EU primaire, CDN local TN, sauvegarde quotidienne
5. **Comment Klasso protège-t-il les données des mineurs ?** → RGPD strict, isolation multi-tenant, audit logs
6. **Y a-t-il un engagement annuel ?** → Engagement annuel pour les tarifs affichés, 30j essai gratuit
7. **Klasso fonctionne-t-il en arabe ?** → Oui, interface complète FR + AR (RTL natif)
8. **Comment formez-vous mon équipe pédagogique ?** → Onboarding personnalisé inclus dans Pro, support email Starter/Standard

Accordion : CSS-only via `<details>` + `<summary>` styled. Pas de JS. Accessible by default.

### 3.10 CTAFinal (NEW)

```
┌────────────────────────────────────────────────────────────┐
│ [Background : zellige-inspired SVG pattern, low opacity,   │
│  --terracotta tint]                                        │
│                                                            │
│         Prête à essayer Klasso dans votre école ?          │
│         ─────────────────────────────────────              │
│                                                            │
│         Démo gratuite 30 minutes. Sans engagement.         │
│                                                            │
│         [ Demander une démo →  ]   [ Se connecter ]        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Full-bleed section between FAQ and DemoForm. Force a final pause + CTA before scrolling to form.

### 3.11 DemoForm (upgraded success state)

Form structure unchanged. But the SUCCESS state becomes a payoff :

```
[Illustration : ouverte enveloppe avec une plume — custom SVG]

Demande reçue ✓

Vous allez recevoir une confirmation à <email>.
Un membre de notre équipe vous contactera dans les 24 heures.

ID de demande : dr_xxx
(JetBrains Mono, pour la traçabilité)
```

Soft satisfaction. Don't over-celebrate (it's a demo request, not a victory).

### 3.12 Footer (upgraded)

```
Klasso
L'école à l'ère numérique
─────────────────────────

Chapitre I  — Élèves           ✅ Disponible
Chapitre II — Parents          ⏳ Été 2026
Chapitre III — Enseignants     ⏳ Été 2026
Chapitre IV — Finance          ⏳ Automne 2026
...

[Tarifs] [Modules] [FAQ] [Contact]

Légal : Mentions · RGPD · CGV

Langue : [FR] [العربية]

© 2026 Klasso · ESS Klasso, Tunis · contact@klasso.tn
Édition v0.5.0
```

"Chapitre I, II..." est la signature *editorial* qui transforme le footer plat en table des matières conceptuelle.

---

## 4. UX-Copy improvements (specific lines)

### Hero — current vs upgrade

| Section | V0 (current) | V0.5 (proposed) |
|---|---|---|
| Title FR | "L'école à l'ère numérique" | **"L'école à l'ère numérique"** (unchanged — locked D25) |
| Subtitle FR | "— sans complexité" | **"— sans complexité"** (unchanged) |
| Description FR | "La plateforme SaaS qui gère élèves, parents, enseignants et finances de votre établissement, en un seul endroit." | **"La plateforme SaaS pensée pour les écoles tunisiennes — élèves, parents, enseignants, finances. En un seul tableau de bord."** (more concrete: "tunisienne" + "tableau de bord" replaces vague "endroit") |
| CTA primaire | "Demander une démo gratuite" | **"Demander une démo gratuite"** (unchanged) |
| CTA secondaire | "Se connecter" | **"Se connecter"** (unchanged) |
| Trust scrollers (NEW) | n/a | **"Hébergement EU + TN · RGPD-ready · Support FR/AR · Sans engagement"** |

### Stats — NEW

| Stat | FR | AR |
|---|---|---|
| 100% | Conformité RGPD & isolation multi-tenant | الامتثال الكامل لـ RGPD وعزل البيانات |
| 4 | Modules en roadmap 2026 | وحدات في خارطة الطريق 2026 |
| 2 × 2 | Bilingue FR · العربية / Web · Mobile | ثنائية اللغة / الويب · الجوال |

### Benefits — 6 piliers FR

1. **Gain de temps** — *Les tâches répétitives (appels, présences, bulletins) en quelques clics.*
2. **Zéro papier** — *Toutes les fiches élèves et bulletins en ligne. Économie réelle, geste écologique réel.*
3. **Mobile-first parents** — *Les parents voient les infos sur leur téléphone — dispo dès été 2026.*
4. **RGPD européen** — *Isolation multi-tenant testée, audit logs, export et droit à l'oubli.*
5. **Support en français et arabe** — *Notre équipe répond en moins de 24h ouvrées, dans votre langue.*
6. **Migration depuis Excel** — *Import CSV en masse. Vos données existantes, intactes, en 1 clic.*

### FAQ — 8 Q/A

(Détails section 3.9 ci-dessus — copy-ready)

### CTA Final — NEW

| Element | FR | AR |
|---|---|---|
| Headline | "Prête à essayer Klasso dans votre école ?" | "هل أنت مستعد لتجربة كلاسو في مدرستك؟" |
| Subline | "Démo gratuite 30 minutes. Sans engagement." | "عرض توضيحي مجاني 30 دقيقة. دون التزام." |
| CTA primaire | "Demander une démo →" | "اطلب عرضًا توضيحيًا ←" |
| CTA secondaire | "Se connecter" | "تسجيل الدخول" |

---

## 5. Image strategy

### 5.1 Source & curation

**Unsplash CC0 — vérifié libre commercial** :

| Usage | Recherche / Photographe | Pourquoi |
|---|---|---|
| Hero photo principale | "children reading books warm light" — Aaron Burden style | Lumière dorée, enfants concentrés, neutre culturellement |
| Hero alt (RTL) | "calligraphy / writing" — Aaron Burden | Lien éditorial + arabe friendly |
| Section "Trust" | "open book pages" | Neutre, institutionnel |
| FAQ background | Subtle SVG zellige pattern (custom, not Unsplash) | Authentique Maghreb |

**Backup pool** (si une URL devient indisponible) :
- `unsplash.com` search : "moroccan school", "tunisian classroom", "north african children" (filter "free to use")
- `pexels.com` search : "school morocco", "education tunisia"

**À éviter absolument** :
- ❌ Photos stock visuellement "early-stage startup TLV/SF" : laptops MacBook, sticky notes colorés, jeunes adultes en T-shirt
- ❌ Photos stock "Africa" génériques : safari, baobab, sourires "feel-good NGO" (= condescendant)
- ❌ Illustrations Storyset / unDraw : trop juvénile pour B2B directeurs d'écoles

### 5.2 Traitement visuel (duotone)

CSS filter sur les `<img>` hero/sections :

```css
.landing-photo {
  filter: sepia(0.25) contrast(1.05) saturate(0.75) brightness(0.95);
  mix-blend-mode: multiply;
}
.landing-photo-overlay {
  background: linear-gradient(135deg, var(--terracotta) / 0.35, var(--teal-deep) / 0.25);
}
```

Donne un duotone terracotta/teal cohérent avec la palette — n'IMPORTE quelle photo de stock devient "Klasso-stylée".

### 5.3 Stockage

**Option A — Vercel /public** (recommandée V0.5)
- `apps/web/public/landing/hero.webp` (1920×1080 ≤150KB)
- `apps/web/public/landing/trust-pattern.svg`
- Served via Vercel CDN, optimized by `next/image`

**Option B — R2 bucket** (V0.7+ si on a besoin de versioning ou dynamic content)
- Pas justifié V0.5 (zéro upload utilisateur sur landing)

**Tailles responsive** (next/image `sizes`) :

```tsx
<Image
  src="/landing/hero.webp"
  alt=""
  fill
  priority
  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1240px"
  className="object-cover landing-photo"
/>
```

---

## 6. Animation strategy détaillée

### 6.1 Hero reveal (signature moment)

```tsx
'use client';
import { motion } from 'motion/react';

const title = "L'école à l'ère numérique";
const words = title.split(' ');

<h1 className="font-display text-6xl md:text-7xl">
  {words.map((word, i) => (
    <motion.span
      key={i}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
      className="inline-block me-[0.25em]"
    >
      {word}
    </motion.span>
  ))}
</h1>
```

Pour AR (RTL) : `me-[0.25em]` (margin-end, locale-aware via Tailwind RTL) au lieu de `mr-`.

### 6.2 Scroll-reveal (sections)

CSS-only, modern browsers :

```css
@supports (animation-timeline: view()) {
  .reveal {
    animation: reveal-in linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 50%;
  }
}
@keyframes reveal-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Fallback for older browsers — IntersectionObserver toggles class */
.reveal[data-revealed='true'] {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
```

Add a small `<ScrollReveal>` client wrapper component that handles the IntersectionObserver fallback.

### 6.3 KPI counter (DashboardMockup)

```tsx
'use client';
import { useEffect, useState, useRef } from 'react';

function CountUp({ to, duration = 600 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setValue(Math.round(to * t));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{value}</span>;
}
```

### 6.4 Reduced motion respect

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Wrap Framer Motion animations with `useReducedMotion()` hook to skip them entirely on opt-out users.

---

## 7. AR/RTL spécificités

### 7.1 Bilingual moments (where to show both)

| Moment | FR | AR | Treatment |
|---|---|---|---|
| Hero | Primary (Fraunces, large) | Secondary (Markazi Text, smaller, dim color) below FR | Both visible on FR locale |
| Hero (AR locale) | Secondary below | Primary | Both visible on AR locale |
| Logo "Klasso" | Always Latin | "كلاسو" never appears next to "Klasso" — only when AR locale, Klasso wordmark becomes "كلاسو" | Mutually exclusive |
| Footer copyright | © 2026 Klasso | © ٢٠٢٦ كلاسو (with arabic numerals) | Each locale renders its own |

### 7.2 RTL adaptations spécifiques aux nouvelles sections

| Section | LTR (FR) | RTL (AR) |
|---|---|---|
| Hero photo | Right side of headline | **Left side of headline** (composition mirrors) |
| Dashboard mockup | KPI cards left-to-right | KPI cards right-to-left (auto via flexbox direction) |
| Pricing | Starter / **Standard** / Pro | Pro / **Standard** / Starter (mirror), Standard featured stays middle |
| Stats counters | Numbers left-aligned | Numbers right-aligned, Arabic numerals (٠١٢٣٤٥٦٧٨٩) |
| FAQ accordion | Caret on right (▼) | Caret on left (▼) |
| Footer columns | Brand left, lang right | Brand right, lang left |
| Reading flow | top-left → bottom-right | top-right → bottom-left |

### 7.3 Tailwind RTL variants

Utiliser les variants natives `rtl:` Tailwind v3.4+ :

```tsx
<div className="ms-4 me-2 ltr:rounded-l-md rtl:rounded-r-md">
```

Use `ms-` (margin-start) and `me-` (margin-end) instead of `ml-`/`mr-` consistently. Already used dans la PR #29 pour LanguageSwitcher — pattern à généraliser sur les nouveaux composants.

### 7.4 Arabic numerals — décision locked

**Décision** : on garde les **chiffres occidentaux `0123456789` partout**, y compris en locale AR.

Rationale :
- La Tunisie urbaine bilingue utilise massivement les chiffres latins au quotidien (factures, banque, prix affichés)
- Universalité > authenticité éditoriale stricte
- Klasio fait pareil — pas un différenciant nécessaire
- Évite confusion lecture pour utilisateurs non-arabophones natifs

Implémentation :
```tsx
const fmt = new Intl.NumberFormat('fr-TN'); // forced FR locale even when display AR
<span>{fmt.format(247)}</span> // → "247" partout
```

Note : `Intl.NumberFormat('ar-TN')` produit `٢٤٧` (chiffres arabes orientaux) qu'on **n'utilise PAS**.

---

## 8. Implementation phases — P5 → P8 (~3.5j)

À ajouter au plan existant `docs/superpowers/plans/2026-05-25-landing-klasso.md` qui couvrait P1–P4.

### Phase P5 — Design system tokens & typography (~0.4j)

1. **Tailwind config** : étendre la `theme.extend.colors` avec nouvelles vars `--paper`, `--ink`, etc.
2. **Google Fonts loading** via `next/font/google` dans `app/[locale]/layout.tsx` :
   ```tsx
   import { Fraunces, Public_Sans, JetBrains_Mono, Markazi_Text, IBM_Plex_Sans_Arabic } from 'next/font/google';
   ```
3. **CSS vars** dans `globals.css` (palette + tokens).
4. **`tailwindcss-rtl`** install + config (si pas déjà couvert par v3.4 native).

### Phase P6 — Reusable atoms (~0.5j)

Nouveaux primitives :

- `components/landing/atoms/drop-cap.tsx` — drop cap component for first paragraph
- `components/landing/atoms/scroll-reveal.tsx` — IntersectionObserver fallback wrapper
- `components/landing/atoms/count-up.tsx` — animated number counter
- `components/landing/atoms/deckle-edge.tsx` — SVG decorative edge for featured pricing
- `components/landing/atoms/zellige-pattern.tsx` — geometric Maghrebi pattern as background
- `components/landing/atoms/section.tsx` — section wrapper with consistent padding + reveal trigger

### Phase P7 — Sections upgrades (~1.5j)

Order of refactor :

1. **Hero** upgraded — photo + bilingual subtitle + reveal animation (~0.3j)
2. **Stats** new — 3 stats with CountUp (~0.15j)
3. **SchoolSegments** new — 3 cards mapped to TenantType (~0.2j)
4. **Benefits** expanded — 3 → 6 piliers, drop cap intro (~0.15j)
5. **DashboardMockup** new — synthetic Sidi Bou Saïd data + KPI counter (~0.25j)
6. **ModulesGrid** refined — palette swap, hover icon rotate (~0.1j)
7. **Trust** with micro-proof — badges, "dernière màj" caption (~0.1j)
8. **Pricing** with deckle edge + ochre badge (~0.15j)
9. **FAQ** new — accordion CSS-only `<details>` (~0.15j)
10. **CTAFinal** new — full-bleed band (~0.1j)
11. **DemoForm** success state polish (~0.1j)
12. **Footer** with "Chapitre" indicators (~0.15j)

### Phase P8 — Image strategy + i18n complete + ADR + PR (~1.1j)

1. **Source + optimize images** to WebP/AVIF, place in `public/landing/` (~0.3j — partial user-action for selecting photos)
2. **Update messages/fr.json + ar.json** for all new section copy (~0.25j)
3. **Polish + Lighthouse + a11y** (~0.25j)
4. **ADR 0008 — Landing UX upgrade Tunisian Editorial direction** (~0.15j)
5. **Open PR + watch CI + auto-merge** (~0.15j)

**Total P5–P8 : ~3.5j**

---

## 9. Files modified / created (anticipation)

### Nouveaux fichiers (~22)

```
apps/web/components/landing/atoms/
├── drop-cap.tsx
├── scroll-reveal.tsx
├── count-up.tsx
├── deckle-edge.tsx
├── zellige-pattern.tsx
└── section.tsx

apps/web/components/landing/
├── stats.tsx                  (NEW)
├── school-segments.tsx        (NEW)
├── dashboard-mockup.tsx       (NEW)
├── faq.tsx                    (NEW)
└── cta-final.tsx              (NEW)

apps/web/public/landing/
├── hero.webp                  (NEW — optimized photo)
├── trust-book.webp            (NEW)
└── icons/                     (NEW — custom SVG line icons for segments)

docs/adr/
└── 0008-landing-tunisian-editorial.md    (NEW, P8)

docs/superpowers/plans/
└── 2026-05-26-landing-ux-upgrade.md     (NEW — bite-sized plan for subagent dispatch)
```

### Fichiers modifiés (~14)

```
apps/web/app/[locale]/layout.tsx          (font loading)
apps/web/app/[locale]/page.tsx            (compose new sections)
apps/web/app/globals.css                  (CSS vars palette)
apps/web/tailwind.config.ts               (theme.extend colors + fonts)
apps/web/components/landing/hero.tsx      (photo + reveal animation)
apps/web/components/landing/benefits.tsx  (3 → 6 piliers + drop cap)
apps/web/components/landing/modules-grid.tsx  (palette refresh)
apps/web/components/landing/trust.tsx     (micro-proofs)
apps/web/components/landing/pricing.tsx   (deckle edge + ochre badge)
apps/web/components/landing/demo-form.tsx (success state polish)
apps/web/components/landing/footer.tsx    (chapitre indicators)
apps/web/messages/fr.json                 (all new copy)
apps/web/messages/ar.json                 (all new copy + numeral choice)
docs/roadmap.md                           (V0.5 entry + D26 lock if needed)
```

### Dépendances nouvelles

```json
{
  "motion": "^12.x.x"  // ~12KB gzip — for hero reveal + LanguageSwitcher
}
```

Note : `motion` (rebrand of `framer-motion`) — version 12+. Use the `motion/react` import path (not `framer-motion/react`).

---

## 10. Critères d'acceptation

- [ ] Landing affiche avec palette Tunisian Editorial (warm cream paper background, terracotta accents) — pas de purple/blue générique
- [ ] Typographie : Fraunces affichage, Public Sans body, JetBrains Mono pour chiffres, Markazi Text + IBM Plex Sans Arabic en AR — confirmé via DevTools
- [ ] Hero affiche une photo (Tunisian classroom) avec traitement duotone terracotta/teal
- [ ] Hero reveal animation : words appear staggered sur page load (FR + AR respectent reading direction)
- [ ] Section Stats avec 3 chiffres animés (CountUp 0 → value)
- [ ] Section SchoolSegments avec 3 cards (Maternelle / Primaire / Mixte) mappées sur TenantType
- [ ] Section Benefits étendue à 6 piliers + drop cap sur intro paragraphe
- [ ] DashboardMockup composant avec synthetic "École Primaire Sidi Bou Saïd" + KPIs animés
- [ ] Section Pricing : card Standard avec deckle edge SVG + ochre badge "Le plus populaire"
- [ ] Section FAQ : 8 Q/A accordion CSS-only (`<details>` natifs)
- [ ] Section CTAFinal full-bleed avec zellige pattern background
- [ ] DemoForm success state émotionnellement satisfaisant (illustration enveloppe + plume)
- [ ] Footer avec "Chapitre I, II..." indicators
- [ ] FR locale : numbers en chiffres occidentaux
- [ ] AR locale : numbers en chiffres arabes (`٢٤٧`), composition miroir (Pricing inversé)
- [ ] Lighthouse mobile : Performance ≥ 90, LCP < 2.5s, CLS < 0.1
- [ ] WCAG 2.1 AA : contrastes ≥ 4.5:1, focus visible, navigation clavier
- [ ] Reduced motion respecté (animations désactivées si `prefers-reduced-motion`)
- [ ] Tests existants V0 (5 unit demo-requests + 3 e2e) toujours verts
- [ ] CI verte sur PR
- [ ] ADR 0008 écrit, roadmap mise à jour

---

## 11. Hors-scope V0.5 explicite

- ❌ Photos de vraies écoles tunisiennes clientes (zéro client en prod)
- ❌ Vidéo démo embarquée (V0.7+)
- ❌ Témoignages clients (V0.7+ quand on a 2-3 références)
- ❌ Blog / articles SEO (V1)
- ❌ Live chat / Crisp / Intercom (V11)
- ❌ Dark mode (V0.7)
- ❌ A/B testing landing variants (V11)
- ❌ Internationalisation au-delà FR/AR (V11 — EN/ES roadmap)
- ❌ Animations Lottie complexes (overkill pour B2B institutionnel)

---

## 12. Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Photos Unsplash retirées | Faible | Bloquant si dernière minute | Backup pool de 5 URLs alternatives par usage |
| `motion` (Framer rebrand) instable en prod | Faible | Moyen | Bundle test sur Vercel preview avant merge ; fallback CSS-only si crash |
| `next/font/google` rate limit | Très faible | Faible | Self-host fonts en fallback (~25KB add to public/) |
| Lighthouse score < 90 à cause images | Moyenne | Moyen | next/image priority + sizes + WebP/AVIF + LCP < 2.5s vérifié en preview |
| Traductions AR de qualité variable | Moyenne | Moyen | Review native speaker avant PR ready (équipe Klasso TN) |
| Effort dépasse 3.5j | Possible | Faible | Phases P5–P8 indépendantes — peuvent ship une à une si besoin |
| Tailwind RTL plugin conflit existant V0 | Faible | Faible | Tests smoke après chaque phase |

---

## 13. Références & inspirations

- Klasio (référence comparative) : `https://ecole-saas.vercel.app/`
- Le Monde Diplomatique : autorité éditoriale typographique
- Frieze magazine : asymétrie discrète
- Apple News+ : drop caps + sereinité éditoriale
- Fraunces font specimen : `https://fonts.google.com/specimen/Fraunces`
- Markazi Text specimen : `https://fonts.google.com/specimen/Markazi+Text`
- next-intl v4 RTL : `https://next-intl.dev/docs/usage/configuration#right-to-left-languages`
- Tailwind RTL variants : `https://tailwindcss.com/docs/configuration#presets`
- Unsplash licensing : `https://unsplash.com/license` (verified commercial-friendly CC0)

---

**Validation requise** : approuver cet axe esthétique (palette terre + cream + sarcelle profonde, polices Fraunces/Public Sans/Markazi Text, photos Tunisie spécifiques, animations subtiles signature) AVANT que je dispatch des subagents pour implémenter.

Si vous voulez ajuster :
- Palette : terracotta vs autre couleur ? (alt : deep teal primary + ochre accent / olive primary + rose accent)
- Polices : Fraunces vs alternative (Recoleta, Tiempos, Söhne ?)
- Photo style : duotone vs full color ?
- Niveau d'animation : signature moment OK vs vouloir plus / moins ?
- AR numerals : arabes indiens (٢٤٧) vs occidentaux (247) ?

Une fois validé, je génère le plan d'exécution P5–P8 bite-sized via `superpowers:writing-plans` et dispatch les implémentations.
