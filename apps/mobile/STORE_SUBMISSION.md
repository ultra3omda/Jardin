# 📱 Klasso Mobile — Guide de publication App Store & Play Store

Guide pas-à-pas pour **tester sur appareil réel** puis **publier** l'app Expo
(`tn.klasso.app`) sur l'App Store (iOS) et le Play Store (Android) via **EAS**.

> Les builds et les tests sur appareil se font **sur ta machine** (un conteneur
> CI ne peut pas joindre ton téléphone ni les serveurs de build Expo).

---

## 0. Prérequis (une seule fois)

| Élément | Comment |
|---|---|
| Compte **Expo** (gratuit) | https://expo.dev → sign up |
| **Apple Developer** (99 $/an) | https://developer.apple.com/programs |
| **Google Play Console** (25 $ une fois) | https://play.google.com/console |
| **EAS CLI** | `npm install -g eas-cli` puis `eas login` |
| **Expo Go** sur ton téléphone | App Store / Play Store |

Pas besoin de Mac : **EAS Cloud** compile iOS pour toi.

---

## 1. Tester sur ton vrai téléphone (gratuit, ~10 min — Expo Go)

```bash
cp apps/mobile/.env.example apps/mobile/.env
# .env →  EXPO_PUBLIC_API_URL=https://api.klasso.tn   (API prod déployée)
pnpm install
pnpm --filter=@klasso/mobile start --tunnel
```

- **iPhone** : Appareil photo → scanner le QR → ouvrir.
- **Android** : Expo Go → *Scan QR code*.

À tester : les **8 personas** (bouton demo-login), un **login réel**, la
navigation **par rôle**, le changement de langue. ⚠️ Les **push notifications**
ne fonctionnent pas dans Expo Go — c'est attendu (elles marcheront dans un build
EAS *development*/*preview*).

> Prérequis backend : `api.klasso.tn` doit pointer vers l'API (Railway) et son
> CORS autoriser l'app. Sinon « Network request failed ».

---

## 2. Initialiser EAS (une fois)

```bash
cd apps/mobile
eas init                 # crée le projet → affiche un EAS_PROJECT_ID
eas build:configure      # vérifie eas.json (déjà présent)
```

Mets le `EAS_PROJECT_ID` en variable d'environnement (le repo le lit dans
`app.config.ts`) — par ex. via les **EAS env vars** ou un `.env` local :

```bash
echo "EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" >> apps/mobile/.env
```

`eas.json` est déjà configuré :
- `preview` → APK Android *internal* + `EXPO_PUBLIC_API_URL=https://api.klasso.tn`
- `production` → build store, `autoIncrement` des numéros de build (source **remote** : EAS gère les versions).

---

## 3. Build de test sur appareil réel (hors store)

```bash
# Android : APK installable directement (glisser sur le téléphone)
eas build --profile preview --platform android

# iOS : build interne → s'installe via TestFlight (compte Apple requis)
eas build --profile preview --platform ios
```

EAS génère/garde les **credentials** (keystore Android, certificats iOS)
automatiquement la 1ʳᵉ fois (réponds *yes* pour qu'EAS les gère).

---

## 4. Assets & métadonnées (à compléter avant soumission)

- **Icône / splash** : un placeholder Klasso (K blanc sur indigo) est déjà
  généré dans `assets/` et référencé par `app.json`. Pour la version finale,
  remplace les fichiers à l'identique (mêmes chemins/tailles) ou relance
  `node scripts/generate-placeholder-icons.mjs`. Spécs : `icon.png` 1024×1024
  **opaque** (pas d'alpha pour iOS).
- **Captures d'écran** (obligatoires) :
  - iOS : 6,7″ (1290×2796) + 5,5″ — depuis le simulateur ou un device.
  - Android : téléphone (≥ 2 captures) + une *feature graphic* 1024×500.
- **Politique de confidentialité** : URL publique **obligatoire** sur les deux
  stores (ex. `https://klasso.tn/privacy`).
- **Textes** : nom (Klasso), sous-titre, description, mots-clés, catégorie
  (Éducation), classification d'âge.

---

## 5. Soumission

### iOS (App Store Connect)
1. Crée l'app dans **App Store Connect** avec le bundle `tn.klasso.app`.
2. Renseigne fiche + **App Privacy** (déclaration des données collectées) + captures.
3. Complète `eas.json` › `submit.production.ios` : `appleId`, `ascAppId`, `appleTeamId`.
4. `eas submit --profile production --platform ios` (ou laisse EAS uploader après build).
5. Soumets pour **review** depuis App Store Connect.

### Android (Play Console)
1. Crée l'app dans **Play Console** (package `tn.klasso.app`).
2. Remplis **Data safety**, contenu, captures, *feature graphic*.
3. Crée un **service account** Google + télécharge la clé JSON →
   `apps/mobile/google-service-account.json` (déjà *gitignored* via `*.jks`… ⚠️
   ajoute-le explicitement à `.gitignore`, NE PAS committer la clé).
4. `eas submit --profile production --platform android` (track **internal** d'abord).
5. Promeus *internal → closed/open testing → production* après validation.

---

## 6. Mises à jour ultérieures

- **JS/UI uniquement** (pas de natif) → **OTA** : `eas update` (mise à jour
  instantanée sans repasser par la review).
- **Natif** (nouveau module, permission, version Expo) → nouveau build + submit.

---

## ✅ Checklist avant 1ʳᵉ soumission

- [ ] App testée sur device réel (Expo Go + build preview) — login, rôles, langues.
- [ ] `api.klasso.tn` opérationnel + CORS app OK.
- [ ] `EAS_PROJECT_ID` configuré.
- [ ] Icône/splash **définitifs** (remplacer le placeholder).
- [ ] Politique de confidentialité en ligne.
- [ ] Captures d'écran iOS + Android + feature graphic Android.
- [ ] `eas.json` submit rempli (Apple IDs / service account Google).
- [ ] Build `production` réussi sur les 2 plateformes.
- [ ] Fiches store complètes (App Privacy / Data safety).
