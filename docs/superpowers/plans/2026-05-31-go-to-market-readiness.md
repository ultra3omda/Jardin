# Klasso — Plan « produit vendable » (Go-To-Market Readiness)

> **Origine :** audit GTM du 2026-05-31 (stack montée en réel : migrations + seed + 56 logins vérifiés).
> **Décision utilisateur :** intégrer le **paiement via la monétique** (passerelle bancaire tunisienne — doc fournie par le client) ; le reste du backlog est **approuvé**.
> **Forme :** plan parapluie → ~10 PRs en tranches verticales, 1 PR = 1 livrable testable. CI verte → merge auto (merge commit).
> **Checkpoints 🛑 (CLAUDE.md) :** toute migration Prisma + tout ce qui touche la facturation/paiement = validation explicite avant exécution.

---

## 0. Passerelle confirmée — ClicToPay (Monétique Tunisie)

✅ Doc reçue et persistée : `docs/payments/clictopay-integration.md`. Modèle = **register → redirect formUrl → returnUrl + callback → getOrderStatus (vérité)**.

Faits structurants extraits :
- **Auth** : `userName`/`password` marchand en paramètres de chaque requête (env `CLICTOPAY_USER`, `CLICTOPAY_PWD`, `CLICTOPAY_BASE_URL`). Pas de token.
- **Initiation** `POST /rest/register.do` : `orderNumber` (unique, ≤32), `amount` en **millimes** (TND ×1000), `currency=788`, `returnUrl`, `failUrl`, `language`, `description` → réponse `{ orderId, formUrl }`. Rediriger vers `formUrl`.
- **Retour navigateur** `returnUrl`/`failUrl` (jamais une preuve).
- **Callback S2S** (GET) : `mdOrder`, `orderNumber`, `operation`, `status` ; **répondre 200** ; pas de signature HMAC.
- **Vérité** : `GET /rest/getOrderStatus.do` → `OrderStatus==2` = payé (codes : 0 non payé, 2 payé, 3 reverse, 4 refund, 6 refusé).
- **Sécurité** (pas de HMAC) : re-vérif `getOrderStatus` + **IP allowlist ClicToPay** + `orderNumber` non devinable.
- **Annulation** `reverse.do` (avant compensation) / **remboursement** `refund.do` (après, partiel possible).
- **Récurrence** : bindings (tokenisation, `clientId` au 1er paiement → `bindingId`) — nécessite activation banque → **auto-renouvellement = phase 2**.
- **Hors code** : pages de paiement hébergées (ZIP XHTML par locale) = tâche **design/ops avec la banque**, à planifier séparément (recette ClicToPay).

> PR-5 livre l'**architecture + `ClicToPayGateway` + `MockGateway`** (e2e via mock) ; PR-6 = branchement test réel ClicToPay + recette.

---

## Architecture transverse (rappel des invariants)

- **Isolation** dérivée du JWT, `RolesGuard`+`@Roles`, extension Prisma tenant, scoping service. Inchangée.
- **Argent** : `Decimal(10,3)` + `currency` (TND), aligné finance V8/T2c. Jamais de float. Jamais de PII/secret en log.
- **Migrations additives** uniquement. Validation 🛑 par migration.
- **Gate local** : `tsc --noEmit` (api+web) + `pnpm lint`. Build/Vitest/e2e/Playwright en CI (autorité).

---

## SPRINT 0 — « Pilote hébergé fiable » (corrige la prod + déploie)

### PR-1 — 🛑 Fix dérive de migration (bug prod confirmé)
**Problème (prouvé live)** : `prisma migrate deploy` (chemin `start:prod`) **ne crée pas** `subjects.coefficient` ni `subjects.emoji` → Matières/Bulletins + seed plantent en prod (`P2022`). La CI le masque (elle utilise `db push`).
- Générer la migration manquante (`ALTER TABLE "subjects" ADD COLUMN "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1, ADD COLUMN "emoji" TEXT;` + renommages d'index `unique_*` → noms Prisma).
- **Durcir la CI** : remplacer `prisma db push` par `prisma migrate deploy` dans le job API (sinon la dérive reviendra) — 🛑 modif `.github/workflows`.
- Vérif : `migrate diff --from-migrations --to-schema-datamodel` doit être **vide**.
- Test : seed complet passe sur DB issue de `migrate deploy`.

### PR-2 — 🛑 Déploiement API (Railway/Render)
- `apps/api/Dockerfile` (multi-stage : build NestJS + `prisma generate` ; `start:prod` = `migrate deploy && node dist/main`).
- `railway.json` (ou `render.yaml`) + variables d'env documentées (`.env.example` complété : `EXPO_PUSH_ACCESS_TOKEN`, `TURNSTILE_SECRET_KEY`, `CLICTOPAY_USER`, `CLICTOPAY_PWD`, `CLICTOPAY_BASE_URL`).
- Étape CI/CD de déploiement API sur push `main` (🛑 workflows). Health-check `/health` après déploiement.
- Aligner l'URL API dans `apps/web/next.config.mjs` (CSP) avec l'hôte réel.

### PR-3 — Provisioning complet « créer une école clé en main »
Compléter le flux SUPER_ADMIN (spec white-label) pour matcher la vision :
- `CreateTenantDto` étendu : logo + jeu de couleurs complet à la **création** (upload presigné R2 avant create).
- Endpoint `POST /admin/tenants/:id/personas` : crée enseignant/parent/staff initiaux + invitations (tokens 14 j), réponse `{ users, invites }`.
- Option « données de départ » : 1-2 classes + matières standard selon `type` (école/maternelle).
- UI admin : formulaire création multi-étapes (identité+branding → personas → récap liens d'invitation).
- (Optionnel, derrière flag) activer le sous-domaine `<slug>.klasso.tn` : `ENABLE_SUBDOMAIN_RESOLVER=true` + DNS wildcard + doc ops. Sinon rester en `/t/<slug>`.
- Tests e2e : création → personas → invitations → login admin → dashboard brandé.

### PR-4 — Démo « commerciale » solide (seed + identifiants)
- **Identifiants démo fiables** : mot de passe via `DEMO_PASSWORD` (env) documenté dans `SETUP.md`/`DEMO_CREDENTIALS.md` ; `upsertUser` **met à jour le hash** au re-seed (corrige la divergence prouvée en live).
- **Maternelle** : seeder 12-15 élèves + familles (noms tunisiens) → journal/activités/cantine/parent démontrables côté KG.
- Seeder **notes/évaluations** (3 matières × périodes), **présences** (5 derniers jours), **annonces** (2) + **messages** (1-2 fils), **factures** (1-2) → remplit dashboards et pages aujourd'hui vides.
- Garder l'**idempotence**.

> **Fin Sprint 0 = pilote payant manuel possible** (1-2 écoles, hébergé par toi).

---

## SPRINT 1 — « SaaS payant » (monétique + nettoyage front + i18n)

### PR-5 — 🛑 Abonnements + paiement monétique (cœur commercial)
**Modèles Prisma (additifs)** :
- `SubscriptionPlan` (name, interval `MONTHLY|YEARLY`, price `Decimal(10,3)`, currency `TND`, limites/features).
- `TenantSubscription` (tenantId, planId, status `TRIALING|ACTIVE|PAST_DUE|CANCELED`, currentPeriodStart/End, trialEnd?).
- `PaymentTransaction` (tenantId, subscriptionId?, amount, currency, status `PENDING|PAID|FAILED|REFUNDED`, gatewayRef, gatewayOrderId, rawPayload JSON, idempotencyKey).

**Architecture (port + adaptateurs)** :
- Port `PaymentGateway` : `createPayment({ orderNumber, amountMillimes, currency, returnUrl, failUrl, language, description }) → { gatewayOrderId, redirectUrl }`, `getStatus(gatewayOrderId) → { orderStatus, raw }`, `refund(gatewayOrderId, amountMillimes)`, `reverse(gatewayOrderId)`.
- Adaptateurs : `ClicToPayGateway` (REST `register.do`/`getOrderStatus.do`/`reverse.do`/`refund.do`, auth user/pwd, `currency=788`, montant millimes = `Decimal × 1000`) + `MockGateway` (tests/dev).
- `payments` module NestJS :
  - `POST /payments/checkout` (school-admin/super-admin) → crée `PaymentTransaction PENDING` avec `orderNumber` unique → `register.do` → renvoie `redirectUrl` (formUrl).
  - `GET /payments/return` (retour navigateur) → **re-vérifie via `getOrderStatus.do`** (jamais confiance au retour) → redirige UI succès/échec.
  - `GET /payments/callback` (S2S ClicToPay) : **répond 200 immédiatement**, idempotent sur `(mdOrder, operation)`, puis `getOrderStatus.do` comme vérité → `PAID`/`FAILED` + active/renouvelle `TenantSubscription`. IP allowlist ClicToPay.
  - `GET /subscriptions/me` (état abonnement).
- Sécurité : montants calculés **serveur** (jamais depuis le client) ; `orderNumber`/`gatewayOrderId` unique = idempotence ; aucun secret/PAN/`jsonParams` en log ; HTTPS only.
- Tests : unit (TND→millimes, mapping `OrderStatus`, idempotence callback, refus montant client) ; e2e via `MockGateway` (checkout → callback → `getStatus`=2 → abonnement ACTIVE) ; isolation étendue aux 3 modèles.

### PR-6 — Recette ClicToPay (test réel) + page facturation
- `ClicToPayGateway` branché sur `https://test.clictopay.com/rest` avec credentials test → **cycle complet en recette** (paiement OK/KO/annulation/remboursement), cartes de test ClicToPay.
- Callback URL configurée au portail marchand → `/payments/callback` ; vérifier réception + idempotence.
- UI : page **Abonnement/Facturation** (choix plan, état, historique transactions, bouton payer → redirection `formUrl`) côté school-admin ; **MRR/analytics réels** côté SUPER_ADMIN (remplace les « À venir »).
- Monitoring : échec/timeout → `PAST_DUE` ; réconciliation `orderId↔orderNumber↔statut`.
- **Dépendance ops (hors code)** : pages de paiement hébergées (ZIP XHTML brandé) + activation marchand + recette banque — à mener en parallèle avec Monétique Tunisie (contacts en doc).

### PR-7 — Nettoyage anti-démo + modules front manquants
- Remplacer les **12 fallbacks `DEMO_*`** (absences, notes, évaluations, bulletins, emploi du temps, paiements, inscriptions, réglages) par états **loading/empty/error+retry** (jamais de faux silencieux).
- **Emploi du temps** : exposer `TimeSlot` (déjà en base) en module + page ; **Notes** : relier à `evaluations` ou retirer la page.
- UI **RGPD** (export + suppression compte) câblée sur les endpoints existants.
- Tests Playwright sur les parcours nettoyés.

### PR-8 — i18n EN + ES (web) + AR mobile/RTL
- `apps/web/messages/en.json` + `es.json` (compléter AR) ; vérifier RTL AR.
- Mobile : ajouter AR/EN (+ RTL) dans `lib/i18n`.

---

## SPRINT 2 — « Mobile en store + confiance »

### PR-9 — Mobile EAS (builds + soumission)
- `eas.json` (profils preview/production), `app.config` (3 variantes de présentation si besoin, mais **un binaire** rôle-aware), icônes/splash brandés.
- Builds iOS/Android EAS + procédure de soumission stores (doc). Variables `EXPO_PUBLIC_API_URL` prod.
- (Le « 3 apps » reste **un binaire** à onglets selon rôle — clarifié commercialement.)

### PR-10 — Couverture e2e + canaux notifs
- Playwright web sur parcours critiques restants (notes→bulletin, congés/approbation, paiement happy-path via mock).
- e2e mobile (Maestro) : login → liste élèves → bulletin/journal.
- **SMS (Twilio)** + (option WhatsApp) : `NotificationFanoutService` étendu ; préférences par canal ; monitoring delivery email/push.

---

## Critères d'acceptation globaux (produit vendable)

- [ ] `migrate diff` vide ; CI utilise `migrate deploy` ; prod ne casse plus.
- [ ] API déployée (Dockerfile + pipeline) ; web pointe le bon hôte ; `/health` vert en prod.
- [ ] Créer une école depuis l'admin = tenant brandé (logo+couleurs) + personas + invitations + données de départ, en un parcours.
- [ ] Démo : identifiants documentés et stables ; école **et** maternelle riches (élèves, notes, présences, annonces, factures).
- [ ] Paiement monétique fonctionnel de bout en bout en test (checkout → callback signé → abonnement ACTIVE) ; montants serveur ; webhook idempotent ; MRR réel.
- [ ] Zéro page web en fallback démo silencieux ; RGPD déclenchable par l'utilisateur.
- [ ] FR/EN/ES (web) + AR (web+mobile, RTL).
- [ ] Mobile buildé EAS + soumis ; e2e mobile minimal vert.
- [ ] SMS opérationnel ; couverture e2e des parcours critiques.

## Séquencement & dépendances
PR-1 → PR-2 (déploiement dépend de la prod saine) → PR-3/PR-4 (parallélisables) → **PR-5 (code + mock, livrable seul)** → **PR-6 (recette ClicToPay : dépend des credentials test + activation marchand côté banque, pas du code)** → PR-7/PR-8 (parallélisables) → PR-9 → PR-10.
> Doc passerelle : ✅ disponible. Reste à obtenir de la banque : **credentials test ClicToPay** + activation marchand + (pour récurrence) activation **bindings**.

## Hors-périmètre (assumé)
GPS transport temps réel, moteur fiscal paie (CNSS/IRPP), offline mobile avancé, WhatsApp (option), multi-devise hors TND.
