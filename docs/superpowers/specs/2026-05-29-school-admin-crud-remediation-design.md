# T2a — Remédiation CRUD du cœur SCHOOL_ADMIN — Design

> **Statut :** Design approuvé (en attente revue du spec écrit avant `writing-plans`).
> **Date :** 2026-05-29
> **Track :** Track 2 (capacités opérationnelles SCHOOL_ADMIN), sous-projet **T2a**.
> **Références :** `docs/superpowers/specs/2026-05-29-subdomain-per-tenant-design.md` (Track 1, sous-domaines — déjà livré, simplement référencé ici).

---

## 1. Objectif

Rendre **réellement fonctionnel et vérifiable de bout en bout** le CRUD des modules qui possèdent déjà un backend NestJS, sur **web ET mobile**, et **figer le pattern CRUD MVP uniforme** que les sous-projets suivants (T2b/c/d) réutiliseront.

En une phrase : *après la création d'une école, un SCHOOL_ADMIN doit pouvoir gérer enseignants, parents, élèves, classes, matières, périodes, évaluations, présences, annonces, facturation et messagerie — avec persistance réelle prouvée, sans masquage par données de démonstration.*

---

## 2. Constat (état actuel, factuel)

### 2.1 Backend (NestJS) — solide
~21 modules avec CRUD réel, **tenant-scoped + RBAC** via le pipeline `ThrottlerGuard → JwtAuthGuard → RolesGuard → TenantContextInterceptor`. Le `tenantId` est dérivé **uniquement du JWT** (invariant conservé, jamais depuis le Host/sous-domaine). Tous les modèles Prisma du cœur existent déjà.

### 2.2 Web (Next.js) — fonctionnel mais masqué
Les pages du cœur appellent l'API via des proxys `apps/web/app/api/<domaine>/[[...action]]/route.ts`, **mais retombent silencieusement sur des tableaux `DEMO_*` codés en dur dès qu'une requête échoue** (`catch → setState(DEMO_…)`). Conséquences :
- Impossible de distinguer « ça marche » de « c'est cassé mais masqué ».
- Les create/edit/delete peuvent muter l'état local sans persister, en donnant l'illusion du succès.
- Aucune remontée d'erreur explicite à l'utilisateur, aucun retry.

### 2.3 Mobile (Expo) — lecture seule
10 écrans, tous en consultation. `lib/api` ne couvre que `students`, `classes`, `evaluations`, `messaging`, `notifications`. **Aucun formulaire admin** (create/edit/delete) n'existe.

### 2.4 Le problème central
Le **fallback démo silencieux** est l'anti-pattern à éliminer. L'exigence « des démos fonctionnelles de A à Z sans bugs ni erreurs » impose que la démo repose sur des **données réelles persistées** (seed), pas sur des tableaux figés dans le composant.

---

## 3. Décisions verrouillées (entrées de ce design)

| Décision | Choix retenu |
|---|---|
| **Découpage Track 2** | 4 sous-projets : **T2a** (ce spec) · T2b (modules opérationnels manquants) · T2c (RH/Paie) · T2d (Admin SaaS). Chacun a son spec + plan. |
| **Approche T2a** | **Tranches verticales** — un module mené de bout en bout (API → web → mobile → tests) avant le suivant ; les helpers partagés sont extraits au fil de l'eau. |
| **Périmètre T2a** | **Tous les modules fonctionnels existants** (roster cœur **+** évaluations, présences, annonces, billing, messaging). |
| **Surfaces** | Admin CRUD sur **web ET mobile**, MVP uniforme par module. |
| **Migrations Prisma** | **Aucune** — tous les modèles du périmètre existent déjà. |

---

## 4. Périmètre

### 4.1 Modules inclus (cibles de remédiation)

| # | Module | Entité(s) Prisma | Proxy web | Endpoints API existants | RBAC écriture |
|---|---|---|---|---|---|
| 1 | Enseignants | `User` (role TEACHER) | `/api/teachers` → `/api/users/teachers*` | create + list + update + désactivation, `tempPassword` | SCHOOL_ADMIN |
| 2 | Parents | `User` (role PARENT) | `/api/parents` | create + list + update, `tempPassword` | SCHOOL_ADMIN |
| 3 | Élèves | `Student` | `/api/students` | full CRUD + import CSV + photo | SCHOOL_ADMIN |
| 4 | Classes | `Class` | `/api/classes` | full CRUD + affectation enseignant + créneaux | SCHOOL_ADMIN |
| 5 | Liens parent‑élève | `ParentStudent` | `/api/parent-relations` | full CRUD (`relationType`, `isPrimaryContact`) | SCHOOL_ADMIN |
| 6 | Matières | `Subject` | `/api/subjects` | full CRUD (`coefficient`) | SCHOOL_ADMIN |
| 7 | Périodes de notation | `GradePeriod` | `/api/grade-periods` | full CRUD + `close()` | SCHOOL_ADMIN |
| 8 | Évaluations & notes | `Evaluation`, `Grade` | `/api/evaluations` | full CRUD + upsert/delete note + agrégations | SCHOOL_ADMIN, TEACHER |
| 9 | Bulletins | `Bulletin` | `/api/bulletins` | `POST generate`, `GET latest` (génération/lecture, pas CRUD classique) | SCHOOL_ADMIN |
| 10 | Présences | `Attendance` | `/api/attendance` | list par classe+date, bulk upsert, update | SCHOOL_ADMIN, TEACHER |
| 11 | Annonces | `Announcement` | `/api/announcements` | full CRUD + audience (ALL/PARENTS/TEACHERS/STAFF) | SCHOOL_ADMIN |
| 12 | Facturation | `Invoice` (+ paiements) | `/api/billing` | CRUD facture + enregistrement paiement (PENDING→PARTIAL→PAID) | SCHOOL_ADMIN |
| 13 | Messagerie | `Conversation`, `Message` | `/api/messaging` | conversations create/get/list, historique, lecture | tous rôles (scoping participant) |

> Les pages web `notes`, `schedule`, `enrollments`, `payments` sont des **vues alternatives** de classes/grades/students/billing : elles partagent le même problème de fallback et sont remédiées avec leur module parent (pas comme des modules distincts).

### 4.2 Hors‑périmètre (rappel explicite)
- **T2b** (spec dédié, **migrations Prisma requises**) : cantine, transport, santé, sécurité, discipline, journal, activités — pages 100 % démo sans backend.
- **T2c** : RH / Paie (contrats, congés, bulletins de paie) — la page `hr` actuelle génère des données fictives ; seul le nettoyage de sa **liste enseignants** (qui réutilise le module 1) entre dans T2a.
- **T2d** : Admin SaaS (`admin/analytics`, `admin/audit`, `admin/tenants`, dashboard plateforme).
- **Aucune modification** de l'isolation multi‑tenant, du schéma Prisma, des workflows CI, ou du `package.json` racine.

---

## 5. Architecture & pattern CRUD MVP uniforme

L'approche est *vertical slices* : on n'écrit **pas** tout le scaffolding en amont. Le **premier module** (Enseignants) sert de gabarit ; ses primitives réutilisables sont extraites puis réappliquées aux modules suivants. Cible une fois extrait :

### 5.1 Contrat de ressource standard
Chaque ressource expose le même contrat logique côté client :
`list(params) · getById(id) · create(dto) · update(id, dto) · remove(id)` (soft‑delete quand le backend le supporte). Ces opérations existent déjà côté NestJS ; T2a les **vérifie et complète au cas par cas**, sans nouveau modèle.

### 5.2 Web — primitives partagées
- **`useResource<T>(domain)`** : wrapper TanStack Query encapsulant les 5 opérations via le proxy `/api/<domain>`, avec invalidation de cache après mutation. **Plus aucun fallback `DEMO_*`.**
- **`<ResourceListPage>`** : liste paginée + recherche + bouton « Nouveau », branché sur `useResource`.
- **`<CrudModal>`** : formulaire create/edit générique (champs déclarés par module), validation **Zod**, affichage des erreurs serveur, gestion du `tempPassword` pour les comptes (enseignants/parents).
- **États explicites obligatoires** : `loading` (skeleton), `empty` (état vide informatif + CTA), `error` (message + bouton **Réessayer**). Ces états **remplacent** le fallback démo.

### 5.3 Mobile — primitives partagées
- Nouveaux clients `apps/mobile/lib/api/<domain>.ts` pour les modules non couverts (teachers, parents, subjects, grade-periods, attendance, announcements, billing, parent-relations), alignés sur `client.ts` existant (auth + tenant via JWT).
- **`<CrudScreen resource>`** + **`<CrudForm>`** : équivalents mobiles de la liste + formulaire, mêmes états loading/empty/error+retry.
- **Hub « Gestion »** : un écran de gestion accessible depuis le **dashboard admin** (section « Gestion de l'établissement »), listant les ressources gérables et routant (navigation *stack*) vers chaque `<CrudScreen>`. **Pas de nouvel onglet** dans la barre (la barre SCHOOL_ADMIN reste : Tableau · Élèves · Classes · Pédagogie · Notifs · Profil). Élèves/Classes gagnent leurs formulaires *in‑place* ; les autres ressources passent par le hub.

### 5.4 Stratégie de démonstration (remplace `DEMO_*`)
- Le(s) tenant(s) de démo deviennent **des tenants comme les autres**, peuplés par le **seed** (`apps/api/prisma/seed.ts`) avec des données réalistes pour les 13 modules.
- Suppression des tableaux `DEMO_*` codés en dur dans les pages web (et de la logique `catch → demo`).
- Résultat : la démo exerce le **vrai** chemin CRUD ; ce qui s'affiche est ce qui est persisté.

### 5.5 Invariants de sécurité (inchangés)
- Isolation tenant **dérivée du JWT** uniquement ; `RolesGuard` + `@Roles` conservés tels quels.
- Gardes RBAC répliquées côté UI **pour l'affichage** (masquer les actions non autorisées), l'autorité restant le backend.
- Validation d'entrée à la frontière (Zod web / class‑validator API). Aucun secret en clair, aucune PII en log.

---

## 6. Gestion d'erreurs & états (règle transverse)

| État | Comportement attendu (web & mobile) |
|---|---|
| Chargement | Skeleton (jamais un spinner nu, jamais du contenu démo) |
| Vide | Message informatif + CTA (« Aucun enseignant. Ajouter le premier ») |
| Erreur | Message lisible + bouton **Réessayer** ; l'erreur n'est **jamais** avalée |
| Succès mutation | Invalidation du cache + toast de confirmation ; relecture serveur |
| Non autorisé (403) | Action masquée en amont ; si atteinte, message clair |

---

## 7. Stratégie de tests & vérification

- **Unitaire (API)** : services tenant‑scoped — conservés/étendus (Vitest, en CI ; bloqué localement par `ERR_DLOPEN_FAILED`).
- **Isolation multi‑tenant** : le test critique existant reste vert ; étendu aux modules touchés.
- **Web** : `type-check` local (lint/build en CI). E2E Playwright (CI) sur le **parcours A‑Z** : créer enseignant → parent → élève → classe → affecter élève → lier parent → matières → périodes → (annonce, présence).
- **Persistance prouvée** : après chaque création, **reload** de la page et vérification que la donnée vient du serveur (pas d'état local) — c'est le critère anti‑fallback.
- **Mobile** : `jest` (jest‑expo) sur les nouveaux clients `lib/api` et la logique de formulaire ; `type-check` local.

---

## 8. Plan de livraison en vagues (tranches verticales)

Chaque module = une tranche verticale indépendante → idéalement **une PR par module** (ou par petit groupe), CI verte → merge auto.

- **Vague 1 — Roster « créer une école A‑Z »** : Enseignants (gabarit, extraction des primitives) → Parents → Élèves → Classes → Liens parent‑élève.
- **Vague 2 — Configuration pédagogique** : Matières → Périodes → Évaluations & notes → Bulletins (vérif génération/lecture).
- **Vague 3 — Opérations** : Présences → Annonces → Facturation → Messagerie. *(Ces modules restent dans le périmètre web ET mobile. L'admin CRUD mobile des modules back‑office lourds — facturation, annonces, messagerie — est simplement séquencé en dernier, avec une ergonomie mobile volontairement minimale ; le web de ces modules reste prioritaire et complet.)*

---

## 9. Risques & points d'attention

- **Volume** : 13 modules × (web + mobile) est conséquent. Mitigation : tranches verticales + extraction du pattern dès le module 1 ⇒ coût marginal décroissant.
- **Seed démo** : étendre le seed sans casser les comptes de démo existants (demo‑login). À traiter avec soin (le seed est idempotent).
- **Mobile back‑office** : facturation/messagerie ont une valeur d'usage moindre sur téléphone pour un admin. Elles **restent dans le périmètre** (décision web ET mobile) mais sont séquencées en dernier, avec une UI mobile minimale (liste + actions essentielles).
- **Pas de régression d'isolation** : toute remédiation conserve le scoping JWT ; revue sécurité sur chaque PR touchant un service.

---

## 10. Critères d'acceptation T2a

- [ ] Aucune page web du périmètre ne contient plus de tableau `DEMO_*` ni de `catch → demo` ; états loading/empty/error+retry partout.
- [ ] Les 13 modules ont un CRUD admin fonctionnel et **persisté** sur web ; create/edit/delete vérifiés après reload.
- [ ] Mobile : hub « Gestion » + `<CrudScreen>`/`<CrudForm>` opérationnels pour le roster (élèves, classes in‑place ; enseignants/parents/matières/périodes via hub), puis les autres modules selon la vague 3.
- [ ] Données de démo servies par le **seed** (tenant de démo réel), pas par des constantes de page.
- [ ] Parcours A‑Z (création école → roster → pédagogie) vert en E2E Playwright (CI).
- [ ] Test d'isolation multi‑tenant toujours vert ; `type-check` local vert ; CI verte → merge auto par PR.
- [ ] Aucune migration Prisma, aucun changement d'isolation, aucun changement CI/`package.json` racine.

---

## 11. Suite

Après revue de ce spec : `superpowers:writing-plans` pour produire le plan d'implémentation T2a détaillé (tâches bite‑sized, par tranche verticale / par module). T2b, T2c, T2d feront l'objet de specs + plans séparés.
