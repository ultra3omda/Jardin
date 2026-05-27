# V7-B — Mobile Design Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Klasso mobile app (single Expo app with persona switcher) to the same V7 Klasio-inspired design system shipped in V7-A — shared `packages/ui-mobile` design tokens + atomic components, NativeWind V7 colors, demo accounts 1-click auto-login mirroring the web flow, V7 login + bottom tab bar + persona-aware dashboard.

**Architecture:**
- New shared package `packages/ui-mobile` exposing pure design tokens (`colors`, `typography`, `spacing`, `radius`) + 3 atomic RN components (`Button`, `KpiCard`, `Avatar`) consumable from `apps/mobile`.
- `apps/mobile` (single Expo app, `EXPO_PUBLIC_PERSONA` switcher — NOT 3 apps; reality differs from spec §9 phrasing, see Reality Reconciliation below) refactors :
  - `tailwind.config.js` extended with V7 navy/ambre/paper/ink tokens (consumed via NativeWind classes)
  - Login screen → hero image + form + 4 demo persona buttons (auto-login via `POST /api/auth/demo-login`)
  - `(app)/_layout.tsx` switches from `<Stack>` to `<Tabs>` with persona-aware tab list + V7 ambre active state
  - Dashboard reads role + tenant.type and renders persona-specific KPIs

**Tech Stack:** Expo SDK 51 · React Native · Expo Router · NativeWind 4 · Zustand auth store (existing) · i18next (existing) · expo-secure-store (existing) · `@ecole-saas/shared` (existing) · NEW `@klasso/ui-mobile` workspace package.

**Wave:** V7-B follows V7-A (merged to main 2026-05-27 in PR #38 commit `055c68f`).

**Base commit:** `055c68f` (main after V7-A merge).

**Branch to create:** `claude/v7-b-mobile` (from origin/main, NOT from claude/v7-design).

---

## Reality Reconciliation vs Spec §9

The V7 spec §9 says "3 apps Expo : `apps/mobile-parent`, `apps/mobile-teacher`, `apps/mobile-admin`". **This is incorrect in current reality.** The actual scaffold from V1.7-A is a **single** `apps/mobile` Expo app using the env var `EXPO_PUBLIC_PERSONA` (parent / teacher / admin) for persona switching at build time — same code, different binary per store submission (V12 builds).

This plan implements V7-B against the **real** structure (single app). The "3 apps" interpretation is reserved for V12 when EAS Build differentiates the store binaries. ADR 0014 (created in this plan) locks the decision.

---

## File Structure (~14 files)

### New `packages/ui-mobile` (9 files)
- **Create:** `packages/ui-mobile/package.json`
- **Create:** `packages/ui-mobile/tsconfig.json` (extends `@ecole-saas/typescript-config/base.json`)
- **Create:** `packages/ui-mobile/src/index.ts` (barrel export)
- **Create:** `packages/ui-mobile/src/tokens/colors.ts`
- **Create:** `packages/ui-mobile/src/tokens/typography.ts`
- **Create:** `packages/ui-mobile/src/tokens/spacing.ts` (+ radius constants)
- **Create:** `packages/ui-mobile/src/components/Button.tsx`
- **Create:** `packages/ui-mobile/src/components/KpiCard.tsx`
- **Create:** `packages/ui-mobile/src/components/Avatar.tsx`

### Modify / create `apps/mobile` (8 files)
- **Modify:** `apps/mobile/package.json` — add `"@klasso/ui-mobile": "workspace:*"` dep
- **Modify:** `apps/mobile/tailwind.config.js` — extend NativeWind theme with V7 colors
- **Create:** `apps/mobile/lib/api/demo-login.ts` — `demoLogin(persona)` calling NestJS
- **Create:** `apps/mobile/lib/personas.ts` — 4 mobile demo persona buttons
- **Create:** `apps/mobile/lib/tabs.ts` — `getMobileTabs()` persona resolver
- **Modify:** `apps/mobile/app/(auth)/login.tsx` — V7 hero + form + DemoAccountsBlock
- **Modify:** `apps/mobile/app/(app)/_layout.tsx` — Stack → Tabs (persona-aware)
- **Modify:** `apps/mobile/app/(app)/dashboard.tsx` — persona-aware KPIs via ui-mobile
- **Create:** `apps/mobile/app/(app)/messages.tsx` — placeholder tab stub
- **Create:** `apps/mobile/app/(app)/profile.tsx` — placeholder tab stub
- **Create:** `apps/mobile/app/(app)/pedagogy.tsx` — placeholder tab stub

### Docs (2 files)
- **Create:** `docs/adr/0014-v7-b-mobile-design.md`
- **Modify:** `docs/roadmap.md` — add V7-B row

**Total: ~19 files.**

---

## Domain rules to lock

### Persona switcher

`EXPO_PUBLIC_PERSONA = 'parent' | 'teacher' | 'admin'` (build-time env var). Mobile reads this once at startup. Three personas only (not 5) — STAFF + SUPER_ADMIN reserved to web. The mobile demo block exposes 4 personas matching the personas a mobile user is likely to consume:

| Demo button | Persona param sent | tenantSlug |
|---|---|---|
| **Direction école** | `admin-primary` | demo-ecole |
| **Enseignant** | `teacher-primary` | demo-ecole |
| **Parent école** | `parent-primary` | demo-ecole |
| **Parent maternelle** | `parent-kindergarten` | demo-maternelle |

(STAFF + super-admin not surfaced on mobile demo buttons — those are web-only operators in V7.)

### Tab bar per persona

| Persona env var | Tabs |
|---|---|
| `parent` | Accueil · Mon enfant · Messages · Profil |
| `teacher` | Accueil · Mes classes · Messages · Profil |
| `admin` | Dashboard · Élèves · Pédagogie · Profil |

If `EXPO_PUBLIC_PERSONA` unset → default to `parent` (most common consumer).

### Color tokens (mirror web V7)

```typescript
navy:   { 500..900 same hex as web globals.css }
ambre:  { 50,100,500,600,700 same hex }
paper:  { 50,100 same hex }
ink:    { 300,500,700,900 same hex }
```

These power both `packages/ui-mobile/src/tokens/colors.ts` (TypeScript constants) and `apps/mobile/tailwind.config.js` (NativeWind classes like `bg-navy-900`).

---

## Task 1: Create `packages/ui-mobile` skeleton + tokens

**Files:**
- Create: `packages/ui-mobile/package.json`
- Create: `packages/ui-mobile/tsconfig.json`
- Create: `packages/ui-mobile/src/index.ts`
- Create: `packages/ui-mobile/src/tokens/colors.ts`
- Create: `packages/ui-mobile/src/tokens/typography.ts`
- Create: `packages/ui-mobile/src/tokens/spacing.ts`

- [ ] **Step 1: Create `packages/ui-mobile/package.json`**

```json
{
  "name": "@klasso/ui-mobile",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.74.5"
  },
  "devDependencies": {
    "@ecole-saas/typescript-config": "workspace:*",
    "@types/react": "~18.2.45",
    "typescript": "~5.3.3"
  },
  "peerDependencies": {
    "nativewind": "^4.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/ui-mobile/tsconfig.json`**

```json
{
  "extends": "@ecole-saas/typescript-config/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext", "DOM"],
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `src/tokens/colors.ts`**

```typescript
/**
 * V7-B — Mobile design tokens. Mirrors apps/web/app/globals.css V7 vars
 * so both web and mobile share the exact same hex palette.
 */
export const colors = {
  navy: {
    500: '#94a3b8',
    600: '#6b7280',
    700: '#4b5563',
    800: '#1a2028',
    900: '#0f1419',
  },
  ambre: {
    50:  '#fff7e0',
    100: '#fef3c7',
    500: '#fbb13c',
    600: '#e89218',
    700: '#b45309',
  },
  paper: {
    50:  '#f4f4ef',
    100: '#fafbfc',
  },
  surface: '#ffffff',
  ink: {
    300: '#94a3b8',
    500: '#475569',
    700: '#1a1d24',
    900: '#0f1419',
  },
  status: {
    success500: '#16a34a',
    success100: '#dcfce7',
    info500:    '#1d4ed8',
    info100:    '#dbeafe',
    danger500:  '#ef4444',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

export type ColorTokens = typeof colors;
```

- [ ] **Step 4: Create `src/tokens/typography.ts`**

```typescript
/**
 * V7-B — Typography tokens. RN does not load Cormorant Garamond by default;
 * if needed at runtime, register via expo-font + @expo-google-fonts.
 * Until then `fontFamilyBrand` falls back to System on consumer side.
 */
export const typography = {
  /** Brand / heading font (Cormorant Garamond). System fallback if not loaded. */
  fontFamilyBrand: 'CormorantGaramond_600SemiBold',
  /** Body font (system). */
  fontFamilyBody: undefined as string | undefined,
  sizes: {
    h1:    28,
    h2:    22,
    h3:    18,
    body:  14,
    small: 12,
    label: 11,
  },
  weights: {
    regular: '400' as const,
    medium:  '500' as const,
    semibold:'600' as const,
    bold:    '700' as const,
    extra:   '800' as const,
  },
  letterSpacing: {
    label: 1.1,
  },
} as const;

export type TypographyTokens = typeof typography;
```

- [ ] **Step 5: Create `src/tokens/spacing.ts`**

```typescript
/**
 * V7-B — Spacing + radius tokens. Mobile uses absolute dp values.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  full: 9999,
} as const;

export type SpacingTokens = typeof spacing;
export type RadiusTokens = typeof radius;
```

- [ ] **Step 6: Create `src/index.ts` barrel**

```typescript
export { colors, type ColorTokens } from './tokens/colors';
export { typography, type TypographyTokens } from './tokens/typography';
export { spacing, radius, type SpacingTokens, type RadiusTokens } from './tokens/spacing';
```

- [ ] **Step 7: Verify**

```bash
pnpm install
pnpm --filter=@klasso/ui-mobile type-check
```

Expected: PASS (no errors, `@klasso/ui-mobile` recognized as workspace package).

- [ ] **Step 8: Commit**

```bash
git add packages/ui-mobile/
git commit -m "feat(v7-b/ui-mobile): create package skeleton + design tokens (colors/typography/spacing)"
```

---

## Task 2: Add `@klasso/ui-mobile` dep to apps/mobile + extend NativeWind config

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/tailwind.config.js`

- [ ] **Step 1: Add workspace dependency**

Open `apps/mobile/package.json`. In `"dependencies"`, add (preserve alphabetical order if maintained):

```json
    "@klasso/ui-mobile": "workspace:*",
```

Place it right after `"@ecole-saas/shared": "workspace:*",`.

- [ ] **Step 2: Extend tailwind.config.js with V7 colors**

Open `apps/mobile/tailwind.config.js`. Replace the entire `theme.extend.colors` block with:

```javascript
      colors: {
        // V1.6 brand colors (runtime tenant CSS vars) — preserved
        brand: {
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          secondary: 'rgb(var(--brand-secondary) / <alpha-value>)',
        },
        // V7 design tokens (web-aligned)
        navy: {
          500: '#94a3b8',
          600: '#6b7280',
          700: '#4b5563',
          800: '#1a2028',
          900: '#0f1419',
        },
        ambre: {
          50:  '#fff7e0',
          100: '#fef3c7',
          500: '#fbb13c',
          600: '#e89218',
          700: '#b45309',
        },
        paper: {
          50:  '#f4f4ef',
          100: '#fafbfc',
        },
        surface: '#ffffff',
        ink: {
          300: '#94a3b8',
          500: '#475569',
          700: '#1a1d24',
          900: '#0f1419',
        },
      },
```

- [ ] **Step 3: Update content paths to include ui-mobile**

In the same `tailwind.config.js`, replace `content:` with:

```javascript
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui-mobile/src/**/*.{ts,tsx}',
  ],
```

- [ ] **Step 4: Reinstall + verify**

```bash
pnpm install
pnpm --filter=@klasso/mobile type-check
```

Both should PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/tailwind.config.js
git commit -m "feat(v7-b/mobile): add ui-mobile workspace dep + V7 colors in NativeWind"
```

---

## Task 3: ui-mobile atomic components (Button, KpiCard, Avatar)

**Files:**
- Create: `packages/ui-mobile/src/components/Button.tsx`
- Create: `packages/ui-mobile/src/components/KpiCard.tsx`
- Create: `packages/ui-mobile/src/components/Avatar.tsx`
- Modify: `packages/ui-mobile/src/index.ts` (re-export components)

- [ ] **Step 1: Create Button**

Create `packages/ui-mobile/src/components/Button.tsx`:

```tsx
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

/**
 * V7-B — Primary CTA button. Default variant is `primary` (ambre orange,
 * full-width-friendly). `secondary` = white + navy text. `ghost` = no bg.
 */
export function Button({ label, variant = 'primary', loading, disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary' ? colors.ambre[500]
      : variant === 'secondary' ? colors.surface
      : 'transparent';
  const fg =
    variant === 'primary' ? colors.white
      : colors.ink[900];
  const borderColor = variant === 'secondary' ? colors.paper[100] : 'transparent';

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderWidth: 1,
        borderColor,
        borderRadius: radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {loading && <ActivityIndicator color={fg} style={{ marginRight: 8 }} />}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Create KpiCard**

Create `packages/ui-mobile/src/components/KpiCard.tsx`:

```tsx
import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

export type KpiVariant = 'blue' | 'green' | 'orange' | 'amber' | 'pink' | 'purple';

const VARIANT_BG: Record<KpiVariant, string> = {
  blue:   '#1d4ed8',
  green:  '#059669',
  orange: colors.ambre[600],
  amber:  '#d97706',
  pink:   '#be185d',
  purple: '#6d28d9',
};

interface KpiCardProps {
  label: string;
  value: string;
  variant: KpiVariant;
  sub?: string;
}

/**
 * V7-B — KPI card mirroring the web KpiCard. Mobile uses a flat
 * solid color box (no gradient in RN without extra deps).
 */
export function KpiCard({ label, value, variant, sub }: KpiCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 16,
        flex: 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text style={{ color: colors.ink[500], fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }} numberOfLines={1}>
          {label}
        </Text>
        <View style={{ width: 30, height: 30, borderRadius: radius.md, backgroundColor: VARIANT_BG[variant] }} />
      </View>
      <Text style={{ color: colors.ink[900], fontSize: 26, fontWeight: '800', lineHeight: 28 }}>{value}</Text>
      {sub && <Text style={{ color: colors.ink[500], fontSize: 11, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: Create Avatar**

Create `packages/ui-mobile/src/components/Avatar.tsx`:

```tsx
import { Text, View } from 'react-native';
import { colors } from '../tokens/colors';
import { radius } from '../tokens/spacing';

interface AvatarProps {
  initials: string;
  size?: number;
}

/**
 * V7-B — Round avatar with ambre solid background.
 */
export function Avatar({ initials, size = 32 }: AvatarProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: colors.ambre[500],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.white, fontWeight: '700', fontSize: Math.round(size * 0.4) }}>
        {initials.toUpperCase()}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Export from barrel**

Replace `packages/ui-mobile/src/index.ts` with:

```typescript
export { colors, type ColorTokens } from './tokens/colors';
export { typography, type TypographyTokens } from './tokens/typography';
export { spacing, radius, type SpacingTokens, type RadiusTokens } from './tokens/spacing';

export { Button } from './components/Button';
export { KpiCard, type KpiVariant } from './components/KpiCard';
export { Avatar } from './components/Avatar';
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter=@klasso/ui-mobile type-check
pnpm --filter=@klasso/mobile type-check
```

Both PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-mobile/src/components/ packages/ui-mobile/src/index.ts
git commit -m "feat(v7-b/ui-mobile): atomic components (Button, KpiCard, Avatar)"
```

---

## Task 4: Mobile demoLogin client + persona definitions

**Files:**
- Create: `apps/mobile/lib/api/demo-login.ts`
- Create: `apps/mobile/lib/personas.ts`

- [ ] **Step 1: Inspect existing mobile auth client**

Read `apps/mobile/lib/api/auth.ts` and `apps/mobile/lib/api/client.ts` (existing) to see exports + the session response shape. The `demoLogin` will mirror the same return shape so `useAuthStore.setSession` works without changes.

- [ ] **Step 2: Create demoLogin client**

Create `apps/mobile/lib/api/demo-login.ts`:

```typescript
import { ApiError, apiUrl } from './client';

export type DemoPersona =
  | 'admin-primary'
  | 'admin-kindergarten'
  | 'teacher-primary'
  | 'teacher-kindergarten'
  | 'parent-primary'
  | 'parent-kindergarten'
  | 'staff'
  | 'super-admin';

/**
 * V7-B — Auto-login a demo persona via the same NestJS endpoint web uses.
 * Returns the same Session shape as login().
 */
export async function demoLogin(persona: DemoPersona) {
  const res = await fetch(`${apiUrl}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona }),
  });
  if (!res.ok) {
    let code = 'DEMO_LOGIN_FAILED';
    try {
      const body = (await res.json()) as { code?: string };
      code = body.code ?? code;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, code, 'Demo login failed');
  }
  return res.json();
}
```

**Pre-check before writing:** verify `apiUrl` and `ApiError` are exported from `apps/mobile/lib/api/client.ts`. If `apiUrl` is named differently (e.g. `API_BASE`, `apiBaseUrl`), use the actual export name. If `ApiError` does not exist, throw a plain `Error` with `Object.assign(new Error('Demo login failed'), { status: res.status, code })`.

- [ ] **Step 3: Create persona definitions**

Create `apps/mobile/lib/personas.ts`:

```typescript
import type { DemoPersona } from './api/demo-login';

export interface MobilePersona {
  persona: DemoPersona;
  label: string;
  email: string;
  description: string;
}

/**
 * V7-B — 4 demo personas surfaced on the mobile login screen.
 * STAFF + SUPER_ADMIN excluded — those are web-only operators in V7.
 */
export const MOBILE_DEMO_PERSONAS: MobilePersona[] = [
  {
    persona: 'admin-primary',
    label: 'Direction école',
    email: 'admin@demo-ecole.klasso.tn',
    description: 'École primaire — administration',
  },
  {
    persona: 'teacher-primary',
    label: 'Enseignant',
    email: 'prof@demo-ecole.klasso.tn',
    description: 'École primaire — saisie notes',
  },
  {
    persona: 'parent-primary',
    label: 'Parent école',
    email: 'parent@demo-ecole.klasso.tn',
    description: 'École primaire — bulletins enfants',
  },
  {
    persona: 'parent-kindergarten',
    label: 'Parent maternelle',
    email: 'parent@demo-maternelle.klasso.tn',
    description: 'Jardin d\'enfants — photos du jour',
  },
];
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter=@klasso/mobile type-check
```

PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/api/demo-login.ts apps/mobile/lib/personas.ts
git commit -m "feat(v7-b/mobile): demoLogin() client + 4 mobile demo personas"
```

---

## Task 5: Login screen V7 refactor (hero + form + 4 demo buttons)

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Read current login.tsx**

Read the full content of `apps/mobile/app/(auth)/login.tsx`. Identify the existing imports (`useAuthStore`, `useTenantStore`, `login`, etc.) — preserve them. The refactor replaces the layout, not the auth logic.

- [ ] **Step 2: Replace login.tsx with V7 layout**

Replace the entire content with (preserve the existing `login()` import + auth flow):

```tsx
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button, colors, radius } from '@klasso/ui-mobile';
import { ApiError } from '@/lib/api/client';
import { login } from '@/lib/api/auth';
import { demoLogin, type DemoPersona } from '@/lib/api/demo-login';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';
import { MOBILE_DEMO_PERSONAS } from '@/lib/personas';

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const tenantSlug = useTenantStore((s) => s.slug);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPersona, setLoadingPersona] = useState<DemoPersona | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      const session = await login({ email: email.trim(), password, tenantSlug: tenantSlug ?? undefined });
      setSession(session);
      router.replace('/(app)/dashboard');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Email ou mot de passe incorrect.' : 'Erreur de connexion.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDemo(persona: DemoPersona) {
    if (loadingPersona || isLoading) return;
    setLoadingPersona(persona);
    setError(null);
    try {
      const session = await demoLogin(persona);
      setSession(session);
      router.replace('/(app)/dashboard');
    } catch {
      setError('Démo indisponible. Réessaye.');
      setLoadingPersona(null);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper[50] }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero block — navy */}
        <View style={{ backgroundColor: colors.navy[900], padding: 24, paddingTop: 64, paddingBottom: 40 }}>
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '700' }}>📘 Klasso</Text>
          <Text style={{ color: colors.navy[500], fontSize: 12, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
            L'école à l'ère numérique
          </Text>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '600', lineHeight: 28, marginTop: 20 }}>
            La plateforme qui <Text style={{ color: colors.ambre[500] }}>simplifie</Text> votre établissement.
          </Text>
        </View>

        {/* Form block */}
        <View style={{ padding: 24, gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink[900], textAlign: 'center' }}>Bienvenue</Text>
          <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>Connectez-vous à votre espace</Text>

          {error && (
            <View style={{ backgroundColor: '#fee2e2', borderRadius: radius.md, padding: 12 }}>
              <Text style={{ color: '#991b1b', fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="vous@etablissement.tn"
            placeholderTextColor={colors.ink[300]}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 14,
              fontSize: 14,
              color: colors.ink[900],
              borderWidth: 1,
              borderColor: colors.paper[100],
            }}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mot de passe"
            placeholderTextColor={colors.ink[300]}
            secureTextEntry
            autoComplete="password"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: 14,
              fontSize: 14,
              color: colors.ink[900],
              borderWidth: 1,
              borderColor: colors.paper[100],
            }}
          />

          <Button label="Se connecter" onPress={handleLogin} loading={isLoading} disabled={!email.trim() || !password} />

          {/* Demo accounts block */}
          <View style={{ marginTop: 24, padding: 16, backgroundColor: colors.paper[100], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paper[100] }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.ink[500], textAlign: 'center', textTransform: 'uppercase', marginBottom: 12 }}>
              Comptes de démonstration
            </Text>
            <View style={{ gap: 8 }}>
              {MOBILE_DEMO_PERSONAS.map((p) => (
                <Button
                  key={p.persona}
                  label={p.label}
                  variant="secondary"
                  onPress={() => handleDemo(p.persona)}
                  loading={loadingPersona === p.persona}
                  disabled={!!loadingPersona || isLoading}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

**Pre-check before writing:**
- Verify `login()` signature in `apps/mobile/lib/api/auth.ts`. If it accepts a different shape than `{ email, password, tenantSlug? }`, adapt.
- Verify `useAuthStore` exports `setSession`. If named `setAuth` etc., use the actual name.
- Verify `useTenantStore` exposes a `slug` selector. If named differently, adapt.

- [ ] **Step 3: Verify**

```bash
pnpm --filter=@klasso/mobile type-check
```

PASS.

- [ ] **Step 4: Commit**

```bash
git add 'apps/mobile/app/(auth)/login.tsx'
git commit -m "feat(v7-b/mobile): login screen V7 (hero navy + form + 4 demo persona buttons)"
```

---

## Task 6: Tab bar V7 — Stack → Tabs per persona + stub screens

**Files:**
- Create: `apps/mobile/lib/tabs.ts`
- Modify: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/(app)/messages.tsx`
- Create: `apps/mobile/app/(app)/profile.tsx`
- Create: `apps/mobile/app/(app)/pedagogy.tsx`

- [ ] **Step 1: Create tab resolver**

Create `apps/mobile/lib/tabs.ts`:

```typescript
type Persona = 'parent' | 'teacher' | 'admin';

export interface MobileTab {
  /** Route name relative to `app/(app)/` — must match a .tsx file. */
  name: string;
  label: string;
}

/**
 * V7-B — Resolve the bottom tab bar items per persona.
 * Defaults to `parent` if EXPO_PUBLIC_PERSONA is unset or invalid.
 */
export function getMobileTabs(): MobileTab[] {
  const raw = (process.env.EXPO_PUBLIC_PERSONA as string | undefined)?.toLowerCase();
  const persona: Persona = raw === 'teacher' || raw === 'admin' ? raw : 'parent';

  switch (persona) {
    case 'admin':
      return [
        { name: 'dashboard', label: 'Tableau' },
        { name: 'students',  label: 'Élèves' },
        { name: 'pedagogy',  label: 'Pédagogie' },
        { name: 'profile',   label: 'Profil' },
      ];
    case 'teacher':
      return [
        { name: 'dashboard', label: 'Accueil' },
        { name: 'students',  label: 'Mes classes' },
        { name: 'messages',  label: 'Messages' },
        { name: 'profile',   label: 'Profil' },
      ];
    case 'parent':
    default:
      return [
        { name: 'dashboard', label: 'Accueil' },
        { name: 'students',  label: 'Mon enfant' },
        { name: 'messages',  label: 'Messages' },
        { name: 'profile',   label: 'Profil' },
      ];
  }
}
```

- [ ] **Step 2: Refactor `(app)/_layout.tsx` from Stack to Tabs**

Replace `apps/mobile/app/(app)/_layout.tsx` with:

```tsx
import { Tabs } from 'expo-router';

import { colors } from '@klasso/ui-mobile';
import { getMobileTabs } from '@/lib/tabs';

export default function AppLayout() {
  const tabs = getMobileTabs();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ambre[500],
        tabBarInactiveTintColor: colors.navy[700],
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.paper[100],
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.label }}
        />
      ))}
    </Tabs>
  );
}
```

- [ ] **Step 3: Create stub screens for missing tabs**

Create three minimal placeholder screens. Each uses identical structure with different heading + description.

`apps/mobile/app/(app)/messages.tsx`:

```tsx
import { Text, View } from 'react-native';
import { colors } from '@klasso/ui-mobile';

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50], alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 8 }}>Messages</Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
        Disponible bientôt sur mobile (V3-B web déjà livré).
      </Text>
    </View>
  );
}
```

`apps/mobile/app/(app)/profile.tsx`:

```tsx
import { Text, View } from 'react-native';
import { colors } from '@klasso/ui-mobile';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50], alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 8 }}>Profil</Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
        Gestion du profil disponible bientôt.
      </Text>
    </View>
  );
}
```

`apps/mobile/app/(app)/pedagogy.tsx`:

```tsx
import { Text, View } from 'react-native';
import { colors } from '@klasso/ui-mobile';

export default function PedagogyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper[50], alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink[900], marginBottom: 8 }}>Pédagogie</Text>
      <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
        Notes et bulletins disponibles bientôt sur mobile.
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter=@klasso/mobile type-check
```

PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/tabs.ts 'apps/mobile/app/(app)/_layout.tsx' 'apps/mobile/app/(app)/messages.tsx' 'apps/mobile/app/(app)/profile.tsx' 'apps/mobile/app/(app)/pedagogy.tsx'
git commit -m "feat(v7-b/mobile): tab bar V7 (Stack → Tabs, persona-aware, 4 tabs, ambre active) + 3 stub screens"
```

---

## Task 7: Dashboard adaptive per persona

**Files:**
- Modify: `apps/mobile/app/(app)/dashboard.tsx`

- [ ] **Step 1: Read current dashboard**

Read `apps/mobile/app/(app)/dashboard.tsx` to see existing imports + auth store usage. Preserve auth state reading; refactor the visible UI.

- [ ] **Step 2: Replace dashboard.tsx with adaptive V7**

Replace the entire file with:

```tsx
import { ScrollView, Text, View } from 'react-native';

import { KpiCard, type KpiVariant, colors } from '@klasso/ui-mobile';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantStore } from '@/lib/tenant/store';

interface DashboardKpi {
  label: string;
  value: string;
  variant: KpiVariant;
  sub?: string;
}

interface DashboardConfig {
  heading: string;
  subtitle: string;
  kpis: DashboardKpi[];
}

/**
 * V7-B — Resolve the dashboard config for the (role, tenant.type) pair.
 * Mirrors apps/web/lib/dashboard/config.ts at a simplified level for mobile.
 */
function getMobileDashboardConfig(args: {
  role: string | undefined;
  tenantType: string | null | undefined;
  firstName: string | undefined;
}): DashboardConfig {
  const { role, tenantType, firstName } = args;
  const isKG = tenantType === 'KINDERGARTEN';
  const fn = firstName ?? 'utilisateur';

  if (role === 'SUPER_ADMIN') {
    return {
      heading: 'Plateforme',
      subtitle: '17 écoles · 3 demandes en attente',
      kpis: [
        { label: 'Écoles',       value: '17',   variant: 'purple' },
        { label: 'Utilisateurs', value: '1.2k', variant: 'blue' },
        { label: 'Démos',        value: '3',    variant: 'orange' },
      ],
    };
  }

  if (role === 'SCHOOL_ADMIN' && isKG) {
    return {
      heading: 'Tableau de Bord',
      subtitle: 'Jardin Les Pétales',
      kpis: [
        { label: 'Enfants',  value: '68', variant: 'pink' },
        { label: 'Présents', value: '62', variant: 'green' },
        { label: 'Photos',   value: '24', variant: 'amber' },
      ],
    };
  }
  if (role === 'SCHOOL_ADMIN') {
    return {
      heading: 'Tableau de Bord',
      subtitle: 'École Pilote',
      kpis: [
        { label: 'Élèves',   value: '312',  variant: 'blue' },
        { label: 'Présence', value: '92%',  variant: 'green' },
        { label: 'Moyenne',  value: '14.2', variant: 'amber', sub: 'Sur 17 classes' },
      ],
    };
  }

  if (role === 'TEACHER' && isKG) {
    return {
      heading: `Bonjour, ${fn}.`,
      subtitle: 'Vie quotidienne',
      kpis: [
        { label: 'Mes enfants', value: '32', variant: 'pink' },
        { label: 'Photos',      value: '12', variant: 'amber' },
        { label: 'Présents',    value: '29', variant: 'green' },
      ],
    };
  }
  if (role === 'TEACHER') {
    return {
      heading: `Bonjour, ${fn}.`,
      subtitle: '2 classes · 54 élèves',
      kpis: [
        { label: 'Élèves',  value: '54', variant: 'blue' },
        { label: 'Évals',   value: '8',  variant: 'orange' },
        { label: 'Cours',   value: '5',  variant: 'green' },
      ],
    };
  }

  if (role === 'PARENT' && isKG) {
    return {
      heading: 'Yasmine aujourd\'hui',
      subtitle: 'Présente · 4 photos · 2 activités',
      kpis: [
        { label: 'Photos',    value: '4', variant: 'pink' },
        { label: 'Activités', value: '2', variant: 'green' },
        { label: 'Présence',  value: '✓', variant: 'amber' },
      ],
    };
  }
  if (role === 'PARENT') {
    return {
      heading: `Bonjour, ${fn}.`,
      subtitle: '2 enfants à l\'École Pilote',
      kpis: [
        { label: 'Enfants',  value: '2',     variant: 'pink' },
        { label: 'Notes',    value: '5',     variant: 'amber' },
        { label: 'À payer',  value: '180€',  variant: 'orange' },
      ],
    };
  }

  return {
    heading: `Bonjour, ${fn}.`,
    subtitle: 'Bienvenue dans Klasso',
    kpis: [
      { label: 'Bienvenue', value: '👋', variant: 'amber' },
    ],
  };
}

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);

  const config = getMobileDashboardConfig({
    role: user?.role,
    tenantType: tenant?.type ?? null,
    firstName: user?.firstName,
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper[50] }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink[900], lineHeight: 28 }}>
          {config.heading}
        </Text>
        <Text style={{ fontSize: 13, color: colors.ink[500], marginTop: 4 }}>{config.subtitle}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {config.kpis.map((kpi, i) => (
          <KpiCard key={i} label={kpi.label} value={kpi.value} variant={kpi.variant} sub={kpi.sub} />
        ))}
      </View>
    </ScrollView>
  );
}
```

**Pre-check:** verify `useAuthStore.user` and `useTenantStore.tenant` selectors are correct names in the existing stores. If web V7-A uses `tenant?.type` directly while mobile store exposes `useTenantStore((s) => s.type)`, adapt by changing `useTenantStore((s) => s.tenant)` to `useTenantStore((s) => ({ type: s.type }))` or whatever matches the actual store shape.

- [ ] **Step 3: Verify**

```bash
pnpm --filter=@klasso/mobile type-check
```

PASS.

- [ ] **Step 4: Commit**

```bash
git add 'apps/mobile/app/(app)/dashboard.tsx'
git commit -m "feat(v7-b/mobile): dashboard adaptive per persona (7 variants via getMobileDashboardConfig)"
```

---

## Task 8: ADR 0014 + roadmap V7-B entry

**Files:**
- Create: `docs/adr/0014-v7-b-mobile-design.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Create ADR 0014**

Create `docs/adr/0014-v7-b-mobile-design.md`:

```markdown
# 0014 — V7-B Mobile Design (Klasio-inspired mirror of V7-A)

**Date:** 2026-05-27
**Status:** Accepted
**Deciders:** User

## Context

V7-A web design refactor shipped in PR #38 (merged 2026-05-27 at `055c68f`).
Mobile (single Expo app with `EXPO_PUBLIC_PERSONA` switcher per V1.7-A scaffold)
still ran the V1.6 white-label runtime palette + a `<Stack>`-based screen layout.
V7-B brings mobile to design parity with web V7-A.

## Decision

### Single app, not three

Spec V7 §9 mentioned "3 apps Expo : apps/mobile-parent / mobile-teacher /
mobile-admin". **Reality differs**: V1.7-A scaffolded one `apps/mobile` with
`EXPO_PUBLIC_PERSONA` for build-time persona switching (same code, three
binaries at V12 EAS Build time). V7-B builds against the real structure.

### `packages/ui-mobile` workspace package

Shared design tokens (`colors`, `typography`, `spacing`, `radius`) + atomic
components (`Button`, `KpiCard`, `Avatar`). Tokens mirror web `globals.css`
V7 vars exactly (same hex). NativeWind in `apps/mobile/tailwind.config.js`
consumes the same hex values for class-based styling.

### Demo accounts mobile

Mirror web V7-A: 4 buttons (admin-primary, teacher-primary, parent-primary,
parent-kindergarten). STAFF + SUPER_ADMIN excluded from mobile demo (web-only
operators). API endpoint `POST /api/auth/demo-login` reused — same JWT
response shape, same rate-limit 60/h/IP.

### Tab bar persona-aware

`(app)/_layout.tsx` converted from `<Stack>` to `<Tabs>`. `getMobileTabs()`
reads `EXPO_PUBLIC_PERSONA` and returns 4 tabs:
- parent: Accueil / Mon enfant / Messages / Profil
- teacher: Accueil / Mes classes / Messages / Profil
- admin: Tableau / Élèves / Pédagogie / Profil

Default persona = `parent` if env var unset/invalid.

### Dashboard adaptive

`getMobileDashboardConfig(role, tenantType, firstName)` returns 7 variants:
- SCHOOL_ADMIN × PRIMARY / KINDERGARTEN
- TEACHER × PRIMARY / KINDERGARTEN
- PARENT × PRIMARY / KINDERGARTEN
- SUPER_ADMIN (no tenant)

3 KPI cards per variant, simpler than web (no quick actions, no panels —
mobile prioritizes glanceability).

### Out of scope V7-B (V12 or later)

- RTL / AR direction support — V12 Hardening
- Animation polish (Moti / Reanimated) — V12 Hardening
- Demo data reset cron — server-side V8 polish
- Full feature parity per tab (Messages content, Pedagogy content, Profile
  edit form) — those tabs ship as stubs in V7-B and get real implementations
  in their respective waves (Messages = mobile port of V3-B web client at V12,
  etc.)
- Push notifications — V10 Notifications
- Cormorant Garamond loading via expo-font — deferred until first screen that
  needs it (tokens already reference `CormorantGaramond_600SemiBold` but
  fallback to system family if not registered)

### Wave numbering

V7-B follows V7-A — no further renumbering needed (V7-A already bumped
V7-Finance to V8).

## Consequences

**Positive:**
- Mobile design now matches web 1:1 for first-time visitor (login + dashboard).
- `packages/ui-mobile` enables future web→mobile component sharing without
  duplication.
- Demo accounts work on mobile = sales demos can show iOS/Android out of the
  box.

**Negative:**
- 3 placeholder tab screens (Messages / Pedagogy / Profile) ship empty;
  visible but un-actionable. Documented in app copy ("Disponible bientôt").
- Cormorant font not loaded at runtime in V7-B — heading typography falls
  back to system font on mobile. Web parity not exact until V12 typography
  pass.
- Manual mobile testing only (Expo Go or EAS preview). No automated tests
  for mobile screens in V7-B; CI lint deferred to V12 (per existing
  `apps/mobile/package.json` lint script).

## References

- Spec : `docs/superpowers/specs/2026-05-27-v7-design-refactor.md` §9
- Plan : `docs/superpowers/plans/2026-05-27-v7-b-mobile-design.md`
- Web parallel ADR : `docs/adr/0013-v7-design-system.md`
- API demo-login : `apps/api/src/demo-login/` (V7-A)
- Package : `packages/ui-mobile/`
- Mobile screens : `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(app)/_layout.tsx`, `apps/mobile/app/(app)/dashboard.tsx`
```

- [ ] **Step 2: Update roadmap with V7-B row**

Open `docs/roadmap.md`. Locate the V7-A row (added by V7-A Task 14, status "✅ Livré 2026-05-27"). Insert immediately below:

```markdown
| **V7-B** | **Mobile Design Refactor (mirror V7-A)** — `packages/ui-mobile` workspace package (tokens + atomic components), V7 NativeWind colors, login mobile V7 + 4 demo persona buttons (1-clic auto-login), `(app)/_layout.tsx` Stack→Tabs persona-aware (parent/teacher/admin tabs), dashboard adaptive 7 variants (role × tenant.type), ADR 0014. Single Expo app per V1.7-A reality (not 3 apps). | ~2.5j | V7-A | ✅ Livré 2026-05-27 |
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0014-v7-b-mobile-design.md docs/roadmap.md
git commit -m "docs(v7-b): ADR 0014 mobile design + roadmap V7-B entry"
```

---

## Task 9: Final verification + PR + auto-merge

**Files:** none modified — verification + PR only.

- [ ] **Step 1: Full mobile verify**

```bash
pnpm --filter=@klasso/ui-mobile type-check
pnpm --filter=@klasso/mobile type-check
```

Both PASS.

Note: `pnpm --filter=@klasso/mobile lint` is intentionally a no-op (deferred to V12 per existing package.json). `expo start` and EAS build cannot run on this Windows worktree due to Application Control — manual testing via Expo Go on a real device or via CI/EAS preview only.

- [ ] **Step 2: Smoke type-check across whole monorepo**

```bash
pnpm type-check
```

Expected: PASS on api + web + shared + ui-mobile + mobile.

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin claude/v7-b-mobile 2>&1 | tail -5

gh pr create --repo ultra3omda/Jardin \
  --title "feat(v7-b): Mobile Design Refactor (Klasio-inspired mirror of V7-A)" \
  --body "$(cat <<'EOF'
## Summary

V7-B — Mobile design parity with V7-A web. Single Expo app per V1.7-A scaffold reality.

### Highlights

- **\`packages/ui-mobile\`** new workspace package — design tokens (colors/typography/spacing/radius) + atomic components (Button, KpiCard, Avatar). Hex values mirror web globals.css V7 vars 1:1.
- **NativeWind** extended with V7 navy/ambre/paper/ink color families (same hex as web Tailwind).
- **Login V7** — hero navy + form + **DemoAccountsBlock** (4 personas: admin-primary, teacher-primary, parent-primary, parent-kindergarten). 1-click auto-login via existing \`POST /api/auth/demo-login\` (V7-A).
- **Tab bar persona-aware** — \`(app)/_layout.tsx\` converted from \`<Stack>\` to \`<Tabs>\`. \`getMobileTabs()\` reads \`EXPO_PUBLIC_PERSONA\` env and returns 4 tabs adapted to parent / teacher / admin. Active tint = ambre #fbb13c.
- **Dashboard adaptive** — \`getMobileDashboardConfig()\` returns 7 variants (role × tenant.type), each with 3 KPI cards.
- **ADR 0014** + **roadmap V7-B entry**.

### Reality reconciliation

Spec V7 §9 said \"3 apps Expo (mobile-parent / mobile-teacher / mobile-admin)\". The actual V1.7-A scaffold is **one** \`apps/mobile\` with \`EXPO_PUBLIC_PERSONA\` env var. V7-B builds against reality. The \"3 apps\" are 3 *build targets* (EAS Build, V12), not 3 source directories.

### Out of scope

- RTL / AR (V12)
- Cormorant Garamond loading via expo-font (deferred; system fallback active)
- Full content for Messages / Pedagogy / Profile tabs (stubs only — real content per their respective waves)
- Mobile lint + tests (deferred V12 per existing package.json)
- Push notifications (V10)

## Test plan

- [ ] CI verte
- [ ] Manuel : ouvrir Expo Go (ou EAS preview), naviguer vers /login
- [ ] Manuel : click \"Direction école\" → dashboard.tsx affiche \"Tableau de Bord · École Pilote\" + 3 KPIs (Élèves 312, Présence 92%, Moyenne 14.2)
- [ ] Manuel : click \"Parent maternelle\" → dashboard affiche \"Yasmine aujourd'hui\" + 3 KPIs (Photos, Activités, Présence)
- [ ] Manuel : tab bar 4 tabs, active tab ambre, inactive navy
- [ ] Manuel : changer EXPO_PUBLIC_PERSONA=admin et rebuild → tabs deviennent Tableau / Élèves / Pédagogie / Profil
- [ ] CI verte → auto-merge per CLAUDE.md §9
EOF
)" 2>&1 | tail -5
```

- [ ] **Step 4: Wait for CI + auto-merge per CLAUDE.md §9**

```bash
PR=$(gh pr list --repo ultra3omda/Jardin --head claude/v7-b-mobile --json number --jq '.[0].number')
gh pr checks "$PR" --repo ultra3omda/Jardin --watch
gh pr merge "$PR" --repo ultra3omda/Jardin --merge
```

V7-B livré.

---

## Self-review checklist

- [x] **Spec coverage:** Tous les éléments du V7 spec §9 sont couverts par les tasks 1-9. Single app reality documented in ADR 0014. Mobile out-of-scope items (RTL, animations, font loading, real screens for Messages/Pedagogy/Profile) explicitement reportés.
- [x] **Placeholder scan:** Pas de "TBD"/"TODO". Code blocks concrets. Pre-checks identifient les ambiguïtés (login() signature, store selectors) avant que le subagent écrive.
- [x] **Type consistency:** `DemoPersona` réutilisé from `apps/mobile/lib/api/demo-login.ts` dans `personas.ts` et `login.tsx`. `KpiVariant` exporté depuis `@klasso/ui-mobile` consommé dans `dashboard.tsx`. `colors` token consistant entre `Button.tsx`, `KpiCard.tsx`, `Avatar.tsx`, `login.tsx`, `_layout.tsx`, `dashboard.tsx`.
- [x] **TDD ordering:** Pas de test unitaire mobile (deferred V12 per package.json) — fallback : type-check sert de proxy de validation. Pre-checks (read existing files) avant chaque Write empêchent les écrasements aveugles.
- [x] **Auto-merge:** Task 9 attend CI verte puis merge per CLAUDE.md §9.
- [x] **Branch:** Plan crée `claude/v7-b-mobile` from main (after V7-A), pas réutilisation de `claude/v7-design`.

---

## Effort estimate

| Bloc | Effort |
|---|---|
| T1 ui-mobile skeleton + 3 tokens | 0.3j |
| T2 mobile package dep + NativeWind extend | 0.1j |
| T3 3 atomic components | 0.4j |
| T4 demoLogin client + personas | 0.2j |
| T5 Login V7 refactor | 0.5j |
| T6 Stack → Tabs + 3 stub screens | 0.3j |
| T7 Dashboard adaptive 7 variants | 0.4j |
| T8 ADR 0014 + roadmap | 0.2j |
| T9 Verif + PR + auto-merge | 0.1j |

**Total ≈ 2.5j**, matching spec §16 estimate.
