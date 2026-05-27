# V7 — Design Refactor (Klasio-inspired + Dynamic Role/Type Navigation + Demo Mode)

**Date** : 2026-05-27
**Auteur** : Claude (brainstorming session avec utilisateur)
**Status** : 📋 Spec validée — en attente plan d'implémentation
**Vague** : V7 (renumérote l'ancien V7-Finance → V8-Finance, V8-Vie école → V9, etc. Voir §11)
**Effort estimé** : ~6.5j (V7-A web ~4j + V7-B mobile ~2.5j)

---

## 1. Contexte et problème

Klasso a livré V6-A (Pédagogie + Bulletins PDF) le 2026-05-27. Le frontend actuel a deux problèmes que l'utilisateur a identifiés visuellement :

1. **Identité visuelle incohérente** : le landing est en style "Tunisian editorial" (paper warm + Cormorant + rose-dust), mais le login et l'app shell utilisent shadcn Indigo défaut — pas le même monde. Pour les démos commerciales, le résultat manque de "wow" SaaS.
2. **Navigation non adaptative** : l'`AppShellClient` actuel n'a quasi pas de RBAC visuel (`canAdmin` → Administration, `canEditBranding` → Apparence, `!SUPER_ADMIN` → Élèves). Pas de différence visible entre une école primaire et un jardin d'enfants, pas de menu spécifique parent/enseignant/staff.

L'utilisateur a fourni deux captures de référence (Klasio) qui définissent la cible visuelle : login 2 colonnes avec demo accounts + dashboard navy quasi-noir + KPI cards colorées + note pills ambre.

## 2. Décision

**Refonte design complète web + mobile** alignée sur les captures Klasio, avec **menu et tableau de bord dynamiques** selon (rôle utilisateur × type d'établissement), et **demo accounts auto-login** pour démos commerciales publiques.

### Locked design decisions (de la session brainstorming)

| # | Décision | Choix validé |
|---|---|---|
| D1 | Branding | Garder **Klasso** (domaine klasso.tn déjà acheté), copier seulement le **layout** Klasio |
| D2 | Périmètre | Full **web + mobile** (3 apps Expo : parent / teacher / admin) |
| D3 | Direction visuelle | **C-hybride** : navy/petrol sidebar + warm content + Cormorant brand/hero + CTA orange |
| D4 | Palette | **V4 — Pétrole & Ambre** : `#0c2e3a → #134457` + `#fbb13c → #e89218`. Sidebar dashboard plus foncée : `#0f1419` |
| D5 | Demo accounts | **Auto-login 1 clic** sur 4+ personas, visible en prod, rate-limit 60/h/IP, reset données toutes les heures |
| D6 | Top menu landing | Header navy sticky + 4 anchor links (Fonctionnalités / Pour qui / Tarifs / FAQ) + switch FR/AR + Connexion + CTA Démo orange |
| D7 | App shell | Sidebar **#0f1419** quasi-noir avec sections groupées + bord ambre sur item actif + topbar blanc + user pill avec avatar orange |
| D8 | Navigation matrix | Menu **dynamique** : 5 rôles × 3 types d'établissement. Renommages contextuels (Élèves→Enfants, Enseignants→Animateurs, Classes→Groupes d'âge, Notes/Bulletins/Discipline masqués en KINDERGARTEN) |
| D9 | Wave numbering | Ce travail = **V7**. Renumérote V7-Finance → V8, V8-Vie école → V9, etc. (toutes les vagues bloquées sur input externe glissent de +1 dans le doc roadmap) |

---

## 3. Design system V7

### 3.1 Tokens couleur (CSS vars sur `:root`)

Tous ajoutés à `apps/web/app/globals.css` (déjà sous `--paper`, `--ink`, `--rose-dust` existants). Le système de brand white-label (`buildBrandStyleTag`) reste, mais il **override** les tokens V7 quand un tenant a `tenant.brand.primaryColor`.

```css
:root {
  /* ─── V7 sidebar navy ─────────────────── */
  --navy-900: #0f1419;        /* sidebar bg */
  --navy-800: #1a2028;        /* active item bg */
  --navy-700: #4b5563;        /* section labels */
  --navy-600: #6b7280;        /* secondary text on dark */
  --navy-500: #94a3b8;        /* muted text on light */

  /* ─── V7 accent ambre ─────────────────── */
  --ambre-50:  #fff7e0;
  --ambre-100: #fef3c7;       /* note pill bg */
  --ambre-500: #fbb13c;       /* primary accent — CTAs, links, active borders */
  --ambre-600: #e89218;       /* hover / pressed */
  --ambre-700: #b45309;       /* note pill text */

  /* ─── V7 surface ──────────────────────── */
  --paper-50:  #f4f4ef;       /* page background — remplace le sand Tunisian dans l'app */
  --paper-100: #fafbfc;
  --surface:   #ffffff;       /* cards */

  /* ─── V7 ink ──────────────────────────── */
  --ink-900: #0f1419;
  --ink-700: #1a1d24;
  --ink-500: #475569;
  --ink-300: #94a3b8;

  /* ─── V7 status ───────────────────────── */
  --success-500: #16a34a;
  --success-100: #dcfce7;
  --info-500:    #1d4ed8;
  --info-100:    #dbeafe;
  --danger-500:  #ef4444;
}
```

Tailwind config : étendre `theme.colors` avec ces tokens (e.g. `colors.navy[900]`, `colors.ambre[500]`).

**KPI gradient icons** (icon backgrounds, white icon):
- `kpi-icon-blue`   = `linear-gradient(135deg, #3b82f6, #1d4ed8)`
- `kpi-icon-green`  = `linear-gradient(135deg, #10b981, #059669)`
- `kpi-icon-orange` = `linear-gradient(135deg, #fbb13c, #e89218)`
- `kpi-icon-amber`  = `linear-gradient(135deg, #fbbf24, #d97706)`
- `kpi-icon-pink`   = `linear-gradient(135deg, #ec4899, #be185d)` *(maternelle)*
- `kpi-icon-purple` = `linear-gradient(135deg, #a855f7, #6d28d9)` *(super-admin)*

### 3.2 Typographie

| Usage | Font family | Poids | Taille |
|---|---|---|---|
| Brand (logo "Klasso" + section heads Cormorant) | **Cormorant Garamond** (déjà installé via Google Fonts) | 600–700 | 18–24px |
| Hero h1 landing + page titles app | Cormorant Garamond | 600–700 | 26–32px |
| h2 (section) | Cormorant Garamond | 600 | 18–22px |
| Body | system-ui | 500 | 13–14px |
| Label uppercase (KPI label) | system-ui | 700 | 11px / `letter-spacing: 0.08em` |

### 3.3 Forme

- **Radius** : `rounded-md` 6 (items sidebar), `rounded-lg` 10 (KPI icons), `rounded-xl` 12, `rounded-2xl` 14 (cards, KPIs, panels). `rounded-full` (pills, buttons CTA).
- **Sidebar width** : `260px` desktop, drawer mobile.
- **Container max** : `1440px`.
- **Card shadow** : `shadow-sm` `0 1px 2px rgba(0,0,0,0.04)` au repos, `shadow-md` au hover.
- **Note pill** : `inline-flex px-2.5 py-0.5 rounded-full bg-ambre-100 text-ambre-700 text-xs font-semibold`.

### 3.4 Icônes

- Librairie : **lucide-react** (déjà installée). Pas d'emojis dans le code final.
- Icônes sidebar : 18px, `text-current` opacity 0.85.
- Icônes KPI : 20px blanches dans box gradient `40×40` rounded-lg.
- Icônes quick action : 18px gris foncé dans box `32×32` rounded-lg fond `slate-100`.

---

## 4. Login page V7

**Path** : `apps/web/app/[locale]/(auth)/login/page.tsx` (refactor)
**Layout** : `apps/web/app/[locale]/(auth)/layout.tsx` (refactor pour full-screen 2-col)

### Structure

Plein écran (pas de container) — 2 colonnes responsive :

- **Colonne gauche** (50% desktop, masquée mobile, `bg-gradient-to-br from-navy-900 via-[#143966] to-navy-700`, `text-white`):
  - 📘 Klasso (Cormorant 22-24px) + tagline "L'école à l'ère numérique"
  - Hook (Cormorant italic) : "La plateforme qui simplifie la gestion de votre établissement."
  - Liste 4 features avec arrow bullet "→"
  - Footer : "Conçu pour les établissements africains" en bas

- **Colonne droite** (50% desktop, 100% mobile, fond `paper-50`):
  - Card centrée max-w-md
  - Title "Bienvenue" (Cormorant 20px center)
  - Sub "Connectez-vous à votre espace" (text-ink-500 center)
  - Form email + password (avec eye toggle pour password)
  - Row : checkbox "Se souvenir de moi" / link "Mot de passe oublié ?"
  - Button orange full-width avec arrow `→` (Tailwind: `bg-ambre-500 hover:bg-ambre-600 text-white rounded-lg py-3`)
  - Link "Pas encore de compte ? Inscrire votre école"
  - **Demo accounts block** (ci-dessous)

### Demo accounts block

Carte sous le form login, fond légèrement plus sombre que paper :

```
┌─────────────────────────────────────────┐
│  COMPTES DE DÉMONSTRATION               │
│                                         │
│  [📘 Direction      ] [👨 Enseignant    ]│
│   admin@demo.tn       prof@demo.tn      │
│                                         │
│  [👪 Parent         ] [🌱 Animateur     ]│
│   parent@demo.tn      anim@maternelle  │
│                                         │
│  [+ Plus de démos]  ← reveal staff +    │
│                       super-admin       │
└─────────────────────────────────────────┘
```

Chaque bouton :
- Hover ambre subtle (`hover:bg-ambre-50`)
- Persona icon + role label (`text-sm font-semibold`) + email (`text-xs text-ink-500`)
- On-click → `POST /api/auth/demo-login` body `{ persona: 'admin-primary' | ... }` → 200 → setSession → redirect `/dashboard`
- Loading spinner pendant la requête
- Disabled si une autre demo est en cours

---

## 5. Landing top menu V7

**Path** : `apps/web/components/landing/top-nav.tsx` (nouveau composant injecté dans `apps/web/app/[locale]/page.tsx` au-dessus de `<Hero />`)

### Structure

Sticky `position: sticky; top: 0; z-50;`. Transparent au-dessus du hero, devient `bg-navy-900/95 backdrop-blur` quand `window.scrollY > 80px`.

```
[📘 Klasso]        Fonctionnalités  Pour qui ?  Tarifs  FAQ        FR · AR  Connexion  [Démo gratuite →]
```

- Logo (Cormorant 22px white)
- 4 anchor links → `#features`, `#segments`, `#pricing`, `#faq` (smooth scroll, target IDs ajoutés sur les sections existantes du landing)
- Switch FR / AR (réutilise `language-switcher.tsx` existant)
- Link "Connexion" → `/login`
- CTA pill orange "Démo gratuite" → `#demo-form` (scrolls to existing DemoForm) ou ouvre `/login` direct

### Mobile

Logo gauche + hamburger droit. Tapping hamburger ouvre drawer overlay full-screen avec les 4 liens, le switch lang, et les 2 CTA stackés.

---

## 6. App shell V7 (post-login, rôles non-SUPER_ADMIN)

**Path** : `apps/web/app/[locale]/(app)/app-shell-client.tsx` (refactor complet)
**Layout** : `apps/web/app/[locale]/(app)/layout.tsx` (reste root)

### Structure

Grid `260px 1fr`. Sidebar fixed-height + main scrollable.

#### Sidebar (gauche, navy-900)

```
┌────────────────────┐
│ [📘] Klasso        │  ← logo box ambre gradient + nom Cormorant 17px white
│      <tenant.name> │  ← tenant name muted small
├────────────────────┤
│                    │
│ ACCUEIL            │  ← section label uppercase
│ ▦ Tableau de bord  │  ← active = bg navy-800 + border-l-2 ambre-500 + text white
│                    │
│ ADMINISTRATION     │
│ ○ Établissement    │
│ ...                │
│                    │
│ COMPTE             │
│ ○ Profil           │
│                    │
├────────────────────┤
│ [AK] Amadou Koné   │  ← user block bottom, avatar ambre + nom + rôle
│      Admin         │
│ ⇲ Déconnexion      │
└────────────────────┘
```

Items :
- Padding `9px 18px`, gap 12px avec icon
- Hover : `bg-white/3`
- Active : `bg-navy-800`, `border-left: 2px ambre-500`, `text-white font-medium`, padding-left ajusté

Sections (uppercase labels `text-navy-700 text-[10px] tracking-[0.1em] font-semibold px-4 pt-3 pb-1`) :
- Accueil
- Administration (SCHOOL_ADMIN only)
- Scolarité
- Pédagogie
- Vie école
- Communication
- Finance
- Compte

#### Topbar (haut, blanc)

Grid 3 cols : search à gauche flex-1, bell au milieu, user pill à droite.

- **Search pill** : `bg-white rounded-lg px-4 py-2.5 shadow-sm` + icon 🔍 + placeholder "Rechercher une page…"
- **Bell** : `bg-white rounded-full w-9 h-9 shadow-sm` + icon 🔔 + badge rouge top-right (count = unread messages + pending payments + ...)
- **User pill** : `bg-white rounded-full px-3 py-1.5 shadow-sm` + avatar ambre `32×32` + nom + rôle (chargés depuis useAuthStore)

#### Main (paper-50)

Padding `8px 24px 24px`. Le children est rendu dans cette zone.

---

## 7. Navigation menu — dynamique par rôle × type

### 7.1 Source de vérité

**Nouveau fichier** : `apps/web/lib/nav/menu.ts`

```typescript
export interface NavItem {
  id: string;
  labelKey: string;          // i18n key (ou label direct en MVP)
  href: string;              // route Next.js
  icon: LucideIcon;          // lucide-react component
  badge?: () => number;      // optional badge count (e.g., unread messages)
  show?: (user, tenant) => boolean;  // additional condition
}

export interface NavSection {
  id: string;
  labelKey: string;
  items: NavItem[];
}

export function getNavForUser(
  user: AuthenticatedUser,
  tenant: Tenant | null,
): NavSection[];
```

Résolution :
1. Si `user.role === 'SUPER_ADMIN'` → retourne la **plateforme menu** (cross-tenant).
2. Sinon, compose le menu selon `user.role` + `tenant.type` en suivant la matrice §7.2.

### 7.2 Matrice menu × persona × tenant.type

Source : matrice validée pendant le brainstorming (Visual Companion `menu-matrix.html`). Voir aussi `docs/adr/0013-v7-design-system.md` (à créer pendant l'implémentation).

#### SCHOOL_ADMIN

| Section | KINDERGARTEN | PRIMARY_SCHOOL | MIXED |
|---|---|---|---|
| Accueil → Tableau de bord | ✓ | ✓ | ✓ |
| Administration → Établissement / Année / **Groupes d'âge** | ✓ | (Classes) | union |
| Scolarité → **Enfants** / Inscriptions / **Animateurs** / Parents | ✓ | (Élèves / Enseignants) | union |
| Pédagogie → Journal quotidien / Activités / Présences / Planning | ✓ | (Notes / Bulletins / Évaluations / Absences / Discipline / EDT) | union |
| Vie école → Cantine / Transport / Santé (V8/V9) | ✓ | ✓ | ✓ |
| Communication → Messages / Annonces | ✓ | ✓ | ✓ |
| Finance → Paiements / RH-Paie | ✓ | ✓ | ✓ |
| Compte → Profil / Apparence | ✓ | ✓ | ✓ |

#### TEACHER

| Section | KINDERGARTEN (= Animateur) | PRIMARY_SCHOOL |
|---|---|---|
| Accueil → Ma journée | Ma journée | Tableau de bord |
| Mes groupes | Petits / Moyens / Grands (3 sous-items dynamiques) | CP-A / CE1-B / … (classes assignées) |
| Vie quotidienne / Pédagogie | Journal du jour / Photos / Activités / Présences / Mon planning | Saisir notes / Évaluations / Bulletins / Absences / Discipline / Mon EDT |
| Communication | Messages parents / Annonces | Messages / Annonces |
| Compte | Profil | Profil |

#### PARENT

| Section | KINDERGARTEN | PRIMARY_SCHOOL |
|---|---|---|
| Mon enfant (× N children) | "Yasmine — Moyens" | "Lina (CP-A)" + "Karim (CE2-B)" |
| Quotidien (par enfant) | Journal du jour / Photos / Activités / Présences / Cantine | Profil / Notes & Bulletins / Absences / EDT |
| Communication | Messages animatrice / Annonces | Messages / Annonces |
| Finance → Mes factures | ✓ | ✓ |

#### STAFF

Section unique pour tous types :
- Accueil → Tableau opérations
- Élèves → Annuaire (lecture)
- Vie école → Cantine / Transport / Santé / Sécurité
- Pédagogie → Bulletins (lecture)
- Communication → Messages / Annonces

#### SUPER_ADMIN

Plateforme console (pas de tenant context) :
- Plateforme → Vue / Tenants / Demandes démo / Invites tokens
- Système → Audit logs / Analytics / Health checks
- Branding → Apparence globale

### 7.3 Implémentation

Le composant `AppShellClient.Sidebar` lit `useAuthStore().user` + `.tenant` et appelle `getNavForUser(user, tenant)`. Le résultat est mappé en `<NavSection><NavItem … /></NavSection>`.

Le composant `Topbar.UserPill` affiche `user.firstName user.lastName` + rôle traduit (`Admin` / `Enseignant` / `Parent` / `Personnel` / `Super-admin`).

---

## 8. Dashboard widgets — dynamiques par persona × type

Le dashboard `/[locale]/(app)/dashboard/page.tsx` lit `user.role` + `tenant.type` et compose les widgets via `getDashboardConfig(role, tenantType)` (nouveau `apps/web/lib/dashboard/config.ts`).

### Variantes (8 combinaisons clés validées)

| Persona × Type | h1 | KPI 1 | KPI 2 | KPI 3 | Quick actions | Side panels |
|---|---|---|---|---|---|---|
| **SCHOOL_ADMIN × PRIMARY** | "Tableau de Bord" | Total Élèves | Taux Présence | Moyenne Générale | Saisir absences / Voir paiements / + Élève / Annonce | Absences du jour / Prochaines échéances |
| **SCHOOL_ADMIN × KINDERGARTEN** | "Tableau de Bord" | Total Enfants | Présents | Photos du jour | Photo / Activité / Pointage / Annonce | Présences AM/PM / Annonces du jour |
| **TEACHER × PRIMARY** | "Bonjour, {firstName}" | Mes élèves | Évals à corriger | Cours auj. | Nouvelle éval / Pointer / Message parent / Bulletins | Évaluations à venir / Bulletins en attente |
| **TEACHER × KINDERGARTEN** (Animateur) | "Bonjour, {firstName}" | Mes enfants | Photos du jour | Présents | Photo / Activité / Pointage / Message parent | Activités du jour / Pointage manquant |
| **PARENT × PRIMARY** | "Bonjour, {firstName}" | Mes enfants | Nouv. notes | Solde à payer | Bulletin enfant 1 / Bulletin enfant 2 / Payer / Message enseignant | Notes récentes / Annonces |
| **PARENT × KINDERGARTEN** | "{childFirstName} aujourd'hui" | Photos du jour | Activités | Présence | Voir photos / Journal / Message animatrice / Payer | Journal du jour / Annonces |
| **STAFF** | "Bonjour, {firstName}" | Cantine auj. | Bus | Infirmerie | Repas du jour / Trajets / Soin / Incident | Incidents en cours / Trajets retard |
| **SUPER_ADMIN** | "Plateforme Klasso" | Écoles | Utilisateurs | Démos en attente | Nouvelle école / Invite / Analytics / Incidents | Tenants actifs / Demandes démo |

Les widgets sont composés via des sous-composants `<KpiCard variant="blue|green|orange|amber|pink|purple" icon={LucideIcon} label="" value="" sub="" />` et `<QuickAction icon label href />`.

### Tables / panels

- **Dernières notes saisies** (SCHOOL_ADMIN + TEACHER + PARENT × PRIMARY) : table 4 colonnes Élève / Matière / Note (pill ambre) / Date.
- **Journal du jour** (KINDERGARTEN) : timeline d'activités avec mini-photos + heure.
- **Annonces** : carte "Aucune annonce" ou liste des 3 dernières annonces.
- **Mes enfants** (PARENT) : carte par enfant avec photo + classe + dernières notes/photos.

---

## 9. Mobile design system V7 (V7-B)

3 apps Expo : `apps/mobile-parent`, `apps/mobile-teacher`, `apps/mobile-admin` (déjà scaffold V1.7-A avec `EXPO_PUBLIC_PERSONA`).

### Design tokens partagés

Nouveau package : `packages/ui-mobile` (mentionné dans CLAUDE.md mais pas encore créé).

```typescript
export const colors = {
  navy: { 900: '#0f1419', 800: '#1a2028', /* ... */ },
  ambre: { 500: '#fbb13c', 600: '#e89218', /* ... */ },
  paper: { 50: '#f4f4ef' /* ... */ },
  ink: { 900: '#0f1419' /* ... */ },
};

export const typography = {
  fontFamilyBrand: 'CormorantGaramond_600SemiBold',  // expo-google-fonts
  fontFamilyBody: 'System',
};

export const radius = { sm: 6, md: 10, lg: 12, xl: 14, full: 9999 };
```

### App shell mobile

Bottom tab navigator (Expo Router) — 4 tabs par persona :

- **Parent** : Accueil / Mon enfant (× N) / Messages / Profil
- **Teacher** : Accueil / Mes classes / Notes (ou Journal pour KG) / Profil
- **Admin** : Tableau de bord / Élèves / Pédagogie / Profil

Tab bar style :
- Fond white
- Tab actif : icône ambre-500 + label bold
- Tab inactif : icône navy-700 + label régulier

### Login mobile

Image hero illustrative top (style maternelle/école) + form + demo buttons. Pas de 2-col sur mobile.

### V7-B mobile (out of V7-A scope si on split)

- Header avec brand + bell + avatar
- Cards de stats par persona
- Listes scrollables (élèves, messages, etc.)
- Pas de polish animation — fonctionnel d'abord

---

## 10. Demo accounts — auto-login feature

### 10.1 Backend

**Nouveau module** : `apps/api/src/demo-login/`

- `demo-login.controller.ts` :
  ```
  POST /api/auth/demo-login
  Body: { persona: 'admin-primary' | 'admin-kindergarten' | 'teacher-primary'
                  | 'teacher-kindergarten' | 'parent-primary' | 'parent-kindergarten'
                  | 'staff' | 'super-admin' }
  Returns: { user, tenant, accessToken, refreshToken }
  Rate limit: 60/h/IP (@Throttle({ default: { limit: 60, ttl: 3600000 } }))
  Public (no JwtAuthGuard)
  ```
- `demo-login.service.ts` :
  - Map persona → email lookup table (constants)
  - `findUserByPersona(persona)` → query Prisma
  - Throws 404 if user not found (demo not seeded)
  - Throws 403 if `DEMO_ACCOUNTS_ENABLED=false` (env override, default `true` in prod)
  - Issues tokens via existing `AuthService.issueTokens()` — same shape as login
  - Logs audit `demo.login` with persona + IP

### 10.2 Seed

`apps/api/prisma/seed.ts` — étendu pour :

- **2 demo tenants** :
  - `Démo École Pilote` (PRIMARY_SCHOOL) — slug `demo-ecole`
  - `Démo Maternelle` (KINDERGARTEN) — slug `demo-maternelle`
- **Par tenant** : 1 admin + 1 teacher + 1 parent + 1 staff
- **+ 1 super-admin** cross-tenant
- **Données réalistes** :
  - 50 élèves répartis sur 3 classes (CP-A, CE1-B, CE2-A) pour PRIMARY
  - 30 enfants sur 2 groupes (Petits, Moyens) pour KINDERGARTEN
  - 6 matières standards (déjà V6 seed)
  - 3 grade periods (déjà V6)
  - 12 évaluations sur 3 mois passés avec notes réalistes (variance gaussienne autour de 12/20)
  - 8 messages échangés admin↔parent + teacher↔parent
  - 2 annonces publiées

### 10.3 Email mapping

```typescript
const DEMO_PERSONAS = {
  'admin-primary':       { tenantSlug: 'demo-ecole',      email: 'admin@demo-ecole.klasso.tn' },
  'admin-kindergarten':  { tenantSlug: 'demo-maternelle', email: 'admin@demo-maternelle.klasso.tn' },
  'teacher-primary':     { tenantSlug: 'demo-ecole',      email: 'prof@demo-ecole.klasso.tn' },
  'teacher-kindergarten':{ tenantSlug: 'demo-maternelle', email: 'anim@demo-maternelle.klasso.tn' },
  'parent-primary':      { tenantSlug: 'demo-ecole',      email: 'parent@demo-ecole.klasso.tn' },
  'parent-kindergarten': { tenantSlug: 'demo-maternelle', email: 'parent@demo-maternelle.klasso.tn' },
  'staff':               { tenantSlug: 'demo-ecole',      email: 'staff@demo-ecole.klasso.tn' },
  'super-admin':         { tenantSlug: null,              email: 'super@klasso.tn' },
} as const;
```

### 10.4 Reset cron (hourly)

**Out of V7 scope (V7-B)** — pour la première livraison, pas de reset automatique. Les données démo sont simplement persistées telles qu'elles ont été modifiées par les visiteurs. C'est OK pour 80% des cas. Le reset cron sera ajouté dans V7-B si abuse constaté.

Note : la rate-limit 60/h/IP empêche déjà l'abus massif.

---

## 11. Wave numbering (renumérotation roadmap)

### Avant

| V | Scope |
|---|---|
| V7 | Finance (Stripe + Konnect) — bloqué input externe |
| V8 | Stock / Cantine / Transport / Santé / Sécurité |
| V9 | Notifications multi-canal |
| V10 | Admin SaaS |
| V11 | Hardening |
| V12 | Mobile build & store |

### Après

| V | Scope |
|---|---|
| **V7** | **Design Refactor (ce spec) — Klasio-inspired + dynamic nav + demo mode** |
| V8 | Finance (Stripe + Konnect) — bloqué |
| V9 | Stock / Cantine / Transport / Santé / Sécurité (renommée "Vie école") |
| V10 | Notifications multi-canal |
| V11 | Admin SaaS console |
| V12 | Hardening |
| V13 | Mobile build & store |

Mise à jour `docs/roadmap.md` faite pendant l'implémentation V7 (Task 14 du plan d'implémentation à venir).

---

## 12. Out of scope V7

Reportés à V7-B (mini-vague de polish) ou plus tard :

- **RTL / AR direction support** — V7-B
- **Animation polish** (transitions cards, sidebar slide-in) — V7-B
- **Onboarding tour** premier login — V11
- **Demo data reset cron** hourly — V7-B (seulement si abuse observé)
- **A11y audit complet** (WCAG 2.1 AA) — V12 Hardening
- **Frontend Sentry events** pour demo logins + erreurs UI — V12 Hardening
- **Animations Framer Motion** pour widgets dashboard — V7-B
- **Dark mode** vrai — out of scope (sidebar déjà dark, le reste reste light)
- **Mobile widgets polish** (au-delà du shell de base) — V13

---

## 13. Files structure (préview)

Estimation ~35-40 fichiers touchés/créés. Le plan d'implémentation détaillera. Aperçu :

### Web frontend (~20 fichiers)

- `apps/web/app/globals.css` (modify — add V7 tokens)
- `apps/web/tailwind.config.ts` (modify — extend theme.colors.navy/ambre)
- `apps/web/lib/nav/menu.ts` (new — nav matrix)
- `apps/web/lib/nav/icons.ts` (new — lucide icon map)
- `apps/web/lib/dashboard/config.ts` (new — widget config per persona)
- `apps/web/components/app-shell/sidebar.tsx` (new)
- `apps/web/components/app-shell/topbar.tsx` (new)
- `apps/web/components/app-shell/user-pill.tsx` (new)
- `apps/web/components/app-shell/nav-section.tsx` (new)
- `apps/web/components/dashboard/kpi-card.tsx` (new)
- `apps/web/components/dashboard/quick-action.tsx` (new)
- `apps/web/components/dashboard/notes-panel.tsx` (new)
- `apps/web/components/dashboard/announcements-panel.tsx` (new)
- `apps/web/components/landing/top-nav.tsx` (new)
- `apps/web/app/[locale]/(auth)/layout.tsx` (refactor — 2-col)
- `apps/web/app/[locale]/(auth)/login/page.tsx` (refactor — V7 layout)
- `apps/web/components/auth/demo-accounts-block.tsx` (new)
- `apps/web/lib/api/client.ts` (modify — add demoLogin())
- `apps/web/app/[locale]/(app)/app-shell-client.tsx` (refactor)
- `apps/web/app/[locale]/(app)/dashboard/page.tsx` (refactor — persona/type config)

### API backend (~5 fichiers)

- `apps/api/src/demo-login/demo-login.module.ts` (new)
- `apps/api/src/demo-login/demo-login.controller.ts` (new)
- `apps/api/src/demo-login/demo-login.service.ts` (new)
- `apps/api/src/demo-login/demo-login.controller.spec.ts` (new — 4 tests min)
- `apps/api/src/app.module.ts` (modify — register module)
- `apps/api/prisma/seed.ts` (modify — extended demo data)

### Web proxy (~0 fichier)

`apps/web/app/api/auth/[...action]/route.ts` (existant — proxy déjà POST /demo-login automatiquement via le catch-all).

### Mobile (~8 fichiers)

- `packages/ui-mobile/src/tokens/colors.ts` (new)
- `packages/ui-mobile/src/tokens/typography.ts` (new)
- `packages/ui-mobile/src/tokens/spacing.ts` (new)
- `packages/ui-mobile/src/components/Button.tsx` (new)
- `packages/ui-mobile/src/components/KpiCard.tsx` (new)
- `packages/ui-mobile/package.json` (new)
- `apps/mobile/app/(tabs)/_layout.tsx` (refactor — V7 tab bar + persona switch)
- `apps/mobile/app/login.tsx` (refactor — V7 layout)

### Docs (~3 fichiers)

- `docs/adr/0013-v7-design-system.md` (new — locks design tokens + nav matrix)
- `docs/roadmap.md` (modify — renumérotation V7→V13)
- `docs/superpowers/plans/2026-05-27-v7-design-refactor.md` (new — généré par writing-plans)

---

## 14. ADR à créer

`docs/adr/0013-v7-design-system.md` — locks :
- Décisions D1–D9 ci-dessus
- Color tokens definitive
- Typography stack
- Navigation matrix
- Demo-login API contract
- Wave renumérotation
- Pourquoi pas RTL/A11y maintenant (effort vs valeur démos commerciales)

---

## 15. Acceptance criteria V7

V7 est livré quand :

- [ ] Login `/login` montre 2-col + 4 demo buttons fonctionnels (auto-login 1 clic réussit pour les 4 personas primaires + admin/super-admin)
- [ ] Top menu landing visible + sticky + 4 anchors fonctionnels + CTA orange Démo
- [ ] App shell dashboard : sidebar navy + topbar blanc + user pill ambre — pixel-perfect (visuel comparé à la capture user fournie)
- [ ] Menu sidebar **change** quand on switch entre les 8 demos accounts (testé à la main)
- [ ] Dashboard widgets **changent** par persona × type (8 variantes, testé à la main)
- [ ] Mobile : 3 apps Expo affichent V7 tokens (au moins login screen + tab bar) — pas de polish widgets (V7-B)
- [ ] Tests : `demo-login.controller.spec.ts` ≥ 4 tests verts
- [ ] `pnpm type-check && pnpm lint && pnpm build` — vert sur api + web
- [ ] `docs/adr/0013-v7-design-system.md` créé
- [ ] `docs/roadmap.md` mis à jour avec renumérotation
- [ ] PR mergée sur main après CI verte (auto-merge per CLAUDE.md §9)

---

## 16. Effort estimé

| Bloc | Effort |
|---|---|
| Design tokens + Tailwind extend | 0.5j |
| Login 2-col + demo accounts API + block | 1j |
| Landing top menu sticky | 0.5j |
| App shell sidebar + topbar refactor | 1j |
| `getNavForUser()` + matrice + 5 personas | 0.5j |
| `getDashboardConfig()` + KPI/QuickAction/Panel components + 8 dashboard variants | 1j |
| Demo seed data réalistes + super-admin | 0.5j |
| Mobile tokens `packages/ui-mobile` + 3 apps shell + login | 1.5j |
| ADR 0013 + roadmap update + docs | 0.5j |

**Total ≈ 6.5j** (V7-A web ~4.5j + V7-B mobile ~2j si on split).

L'utilisateur a explicitement demandé `Full web + mobile ~5j` (option B au brainstorming). On est légèrement au-dessus de l'estimation initiale — décision : split V7-A (web) puis V7-B (mobile + polish + reset cron) si le temps presse, sinon livrer en une fois.

---

## 17. References

- Captures utilisateur : login Klasio (`ecole-saas.vercel.app/login`) + dashboard admin (`ecole-saas.vercel.app/dashboard/admin`)
- Brainstorming Visual Companion mockups (gitignored) : `.superpowers/brainstorm/*/content/{login-direction, top-menu, top-menu-colors, dashboard-pixel, menu-matrix, dashboard-shell}.html`
- Prisma enums actuels : `apps/api/prisma/schema.prisma:18-37` (`TenantType`, `UserRole`)
- AppShellClient actuel : `apps/web/app/[locale]/(app)/app-shell-client.tsx` (~187 lignes)
- Landing actuel : `apps/web/app/[locale]/page.tsx` + `apps/web/components/landing/*` (12 sections)
- RBAC current : `apps/api/src/*/controller.ts` (vérifié pour students/classes/messaging/subjects/grade-periods/evaluations/bulletins)
- Brand white-label runtime : `apps/web/lib/tenant/brand-style-tag.ts` (V1.6) — reste compatible avec V7 tokens (override via tenant.brand.primaryColor)
