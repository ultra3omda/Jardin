# Mobile — Build & soumission stores (EAS)

> L'app mobile Klasso (`apps/mobile`, Expo SDK 51) est **un seul binaire** dont la
> navigation s'adapte au **rôle** porté par le JWT (parent / enseignant / direction).
> Le « 3 apps » commercial = **3 expériences dans une app**, pas 3 binaires. Distribution
> via les stores avec **EAS Build/Submit**.

## Configuration livrée
- `apps/mobile/eas.json` — profils `development` / `preview` (APK interne) / `production` + `submit.production` (iOS App Store Connect, Android Play track `internal`).
- `apps/mobile/app.config.ts` — étend `app.json` ; injecte `extra.eas.projectId` et l'URL API depuis l'environnement (`EAS_PROJECT_ID`, `EXPO_PUBLIC_API_URL`) → **aucun identifiant de compte committé**.
- Scripts : `pnpm --filter @klasso/mobile eas:build:preview | eas:build:prod | eas:submit:prod`.
- Bundles : iOS `tn.klasso.app`, Android `tn.klasso.app`.

## Pré-requis opérateur (hors code — comptes requis)
1. **Compte Expo (EAS)** : `npm i -g eas-cli` → `eas login` → depuis `apps/mobile` : `eas init` (crée le projet → `EAS_PROJECT_ID`).
2. **Apple** : compte Apple Developer (99 $/an), app créée dans App Store Connect → renseigner `appleId` / `ascAppId` / `appleTeamId` dans `eas.json` (ou via `eas submit` interactif).
3. **Google** : compte Google Play Console (25 $ unique) + **service account JSON** (`google-service-account.json`, non committé) pour `eas submit`.
4. **Assets** : icône 1024² + splash dans `apps/mobile/assets/` (référencés par `app.json`).
5. Variables EAS : `EAS_PROJECT_ID`, `EXPO_PUBLIC_API_URL` (URL API prod).

## Procédure
```bash
cd apps/mobile
eas init                       # une fois — récupère le projectId
eas build --profile preview    # APK/IPA de test interne (QR code / TestFlight)
eas build --profile production --platform all
eas submit --profile production --platform all
```

## Limite honnête
Le **build/soumission réels ne peuvent pas être exécutés ici** (nécessitent les comptes
Expo/Apple/Google ci-dessus). Cette PR livre **toute la configuration** pour qu'un opérateur
lance les builds en une commande une fois les comptes provisionnés. Le `type-check` mobile
valide `app.config.ts` et `eas.json` est conforme au schéma EAS.
