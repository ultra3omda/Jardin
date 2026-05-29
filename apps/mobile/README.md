# @klasso/mobile — Application mobile Klasso

> Application mobile Expo SDK 51 pour les 3 personas Klasso : Parent, Enseignant, Direction.

## ⚡ Quick start (5 minutes)

### Prérequis

- Node.js ≥ 20 ([télécharger](https://nodejs.org))
- pnpm 9+ (`npm install -g pnpm`)
- **Expo Go** sur ton téléphone ([iOS App Store](https://apps.apple.com/app/expo-go/id982107779) | [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Téléphone et PC **sur le même réseau Wi-Fi**

### 1. Variables d'environnement

```bash
cp apps/mobile/.env.example apps/mobile/.env
# Éditer .env si nécessaire (EXPO_PUBLIC_API_URL)
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Lancer le serveur de développement

```bash
pnpm --filter=@klasso/mobile start
```

### 4. Ouvrir sur ton téléphone

- **iPhone** : ouvre l'app **Appareil photo** → pointe vers le QR code → tape la notification
- **Android** : ouvre **Expo Go** → "Scan QR code" → scanne

L'application se recharge automatiquement à chaque sauvegarde de fichier.

---

## 🔍 Tester les écrans

Le boot router (`app/index.tsx`) redirige automatiquement selon l'état :

| État | Redirection |
|---|---|
| Pas de slug sauvegardé | `(onboarding)/school-code` |
| Slug présent, pas de session | `(auth)/login` |
| Session valide | `(app)/dashboard` |

**Forcer un écran spécifique** : modifier `app/index.tsx` > `<Redirect href="...">` temporairement.

---

## 🎭 Onglets par rôle

Depuis V1.7-A, la barre d'onglets est résolue **au runtime** selon le rôle de
l'utilisateur connecté (porté par le JWT), via `getTabsForRole(role)` dans
`lib/tabs.ts`. Un seul binaire sert les trois personas (Parent / Enseignant /
Direction) — plus de flag de build.

| Rôle | Onglets |
|---|---|
| `SCHOOL_ADMIN` | Tableau · Élèves · Classes · Pédagogie · Notifs · Profil |
| `TEACHER` | Accueil · Mes classes · Messages · Notifs · Profil |
| `PARENT` | Accueil · Mon enfant · Messages · Notifs · Profil |
| `STAFF` / `SUPER_ADMIN` | Accueil · Messages · Notifs · Profil |

---

## 📱 Menu développeur (Debug)

Secouer le téléphone physiquement pour ouvrir le menu :
- **Reload** : recharge l'app
- **Open JS Debugger** : debug Chrome DevTools
- **Toggle Performance Monitor** : FPS, JS heap

---

## 🏗️ Architecture

```
apps/mobile/
  app/                     ← Expo Router (file-based)
    _layout.tsx            ← Root : QueryClient + i18n
    index.tsx              ← Boot router (auto-redirect)
    (onboarding)/          ← Avant connexion
      school-code.tsx      ← Saisie code établissement
    (auth)/                ← Login
      login.tsx
    (app)/                 ← App connectée
      dashboard.tsx
  lib/
    api/                   ← Fetch client + auth + tenant
    auth/                  ← Zustand store + SecureStore
    tenant/                ← Zustand store + useTenantBrand
    i18n/                  ← i18next + locales/fr.json
```

---

## 🛠️ Commandes utiles

```bash
pnpm --filter=@klasso/mobile start          # Dev server (Expo Go)
pnpm --filter=@klasso/mobile ios            # Simulateur iOS (Mac + Xcode requis)
pnpm --filter=@klasso/mobile android        # Émulateur Android (Android Studio requis)
pnpm --filter=@klasso/mobile type-check     # TypeScript strict
pnpm --filter=@klasso/mobile lint           # ESLint
```

---

## ❓ Troubleshooting

| Problème | Solution |
|---|---|
| "Network request failed" | Vérifie que l'API tourne (`pnpm --filter=api dev`) et que `EXPO_PUBLIC_API_URL` pointe bien sur ton IP locale (pas `localhost` depuis le téléphone) |
| QR code ne fonctionne pas | Téléphone et PC sur le même Wi-Fi ? Essaie `exp://TON_IP:8081` manuellement dans Expo Go |
| Type errors après `pnpm install` | `pnpm --filter=@ecole-saas/shared build` puis relancer |
| NativeWind classes sans effet | Redémarre le Metro bundler (`Ctrl+C` puis `pnpm start`) |
| "Unable to resolve module @ecole-saas/shared" | `pnpm install` depuis la racine du monorepo |
