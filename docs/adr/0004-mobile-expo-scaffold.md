# ADR 0004 — Mobile Scaffold Expo SDK 51

**Date :** 2026-05-24
**Statut :** Accepté
**Décideurs :** Équipe Klasso
**Référence spec :** docs/superpowers/specs/2026-05-24-v1.7-mobile-scaffold-design.md

## Contexte

Klasso doit livrer 3 applications mobiles natives (Parent / Enseignant / Direction)
pour iOS et Android. L'équipe est petite, le time-to-market critique.

## Décision

**Expo SDK 51** avec React Native 0.74.5 et Expo Router (file-based routing).

1 codebase — flag `EXPO_PUBLIC_PERSONA` (parent|teacher|admin|dev) → 3 builds EAS en V12.

## Alternatives rejetées

| Option | Raison du rejet |
|---|---|
| Flutter | Écosystème séparé de notre stack TS/React |
| React Native CLI pur | Overhead build infra (Xcode/Gradle) trop lourd pour V1.7 |
| React Native Web only | Pas de stores natifs (App Store / Play Store) |
| Capacitor/Ionic | Performance native inférieure, expertise équipe sur RN |

## Stack retenue

- **Expo SDK 51** — managed workflow (pas de `expo eject`)
- **Expo Router ~3.5** — file-based routing (pattern Next.js App Router)
- **NativeWind v4** — Tailwind CSS en React Native
- **Zustand ^5** — auth store en mémoire (pattern identique au web)
- **expo-secure-store** — refresh token (httpOnly équivalent natif)
- **TanStack Query ^5** — cache brand 5min
- **i18next + expo-localization** — i18n FR (multi-langue V2+)

## Conséquences

- Metro config monorepo obligatoire (watchFolders + nodeModulesPaths)
- `@ecole-saas/shared` transpilé par Metro (pas de build préalable nécessaire)
- EAS Build pour les releases (V12) — pas de local build
- Un seul codebase = tests Maestro communs aux 3 personas
