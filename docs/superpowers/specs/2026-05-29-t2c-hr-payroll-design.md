# T2c — RH / Paie (personnel, contrats, congés, paie) — Design

> **Statut :** Validé par l'utilisateur (2026-05-30). Plan à produire après T2d.
> **Date :** 2026-05-29
> **Track :** Track 2 (capacités opérationnelles), sous-projet **T2c**.
> **Références :** `docs/superpowers/specs/2026-05-29-school-admin-crud-remediation-design.md` (T2a — pattern CRUD MVP réutilisé).

---

## 1. Objectif

Remplacer les données RH **fictives générées aléatoirement** (la page `hr` invente salaires, types de contrat et soldes de congés) par un **vrai module RH/Paie** : gestion du personnel (employés = `User` avec rôle `TEACHER`/`STAFF`), **contrats de travail**, **demandes de congés** avec workflow d'approbation, et **calcul de paie MVP** avec bulletins de paie.

En une phrase : *un SCHOOL_ADMIN doit pouvoir gérer le personnel, ses contrats, ses congés et générer des bulletins de paie — sur des données réelles persistées, pas des montants tirés au hasard.*

---

## 2. Constat (état actuel, factuel)

### 2.1 Page `hr` — données inventées
`apps/web/app/[locale]/(app)/hr/page.tsx` (≈121 lignes) :
- récupère la **vraie liste enseignants** via `/api/teachers`,
- mais **enrichit chaque ligne avec des valeurs aléatoires** (`enrich()`) : `contractType` (CDI/CDD/Vacataire/Temps partiel), `salary` (tiré de `SALARIES = [1800, 2200, …]`), `leaveBalance` ;
- fallback complet sur `DEMO_TEACHERS_HR` si l'appel échoue ;
- la « masse salariale » est sommée à partir de **salaires fictifs**.

### 2.2 Aucun backend RH/Paie
- **Aucun modèle** : pas de `EmploymentContract`, `LeaveRequest`, `Payslip`, `SalaryComponent`.
- **Aucun module NestJS** dédié RH/contrats/congés/paie.
- `apps/api/src/users/staff.controller.ts` (`@Controller('users')`) n'expose que **teachers + parents** (`GET/POST/PATCH/DELETE /users/teachers`, `GET/POST /users/parents`) ; les DTOs `dto/staff.dto.ts` ne portent **que** email/prénom/nom/isActive — **aucun champ salaire/contrat/congé**.

### 2.3 Faits de modélisation à respecter
- **Le personnel = `User` + rôle.** `UserRole` : `SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT, STAFF`. Le rôle `STAFF` est aujourd'hui **quasi inutilisé** (seulement dans `AnnouncementAudience`) et **aucun endpoint ne liste les STAFF**.
- **Argent** : la finance V8 utilise `Decimal @db.Decimal(10, 3)` + `currency String @default("TND")` (millimes tunisiens). La paie **doit s'aligner** sur ce format.

---

## 3. Décisions verrouillées (entrées de ce design)

| Décision | Choix retenu |
|---|---|
| **Migrations Prisma** | **REQUISES** (nouveaux modèles RH). Chaque migration = **🛑 checkpoint** → validation utilisateur avant `prisma migrate`. |
| **Modèle employé** | **Pas de modèle `Staff` séparé.** Un employé est un `User` (`TEACHER` ou `STAFF`) ; les données RH (contrat, congés, paie) sont des modèles **liés au `userId`**. |
| **Liste du personnel** | Étendre `staff.controller` pour **lister/CRUD les `STAFF`** (aujourd'hui absents), en plus des teachers déjà couverts. |
| **Format monétaire** | `Decimal(10,3)` + `currency` défaut `"TND"`, **cohérent avec la finance V8**. |
| **Calcul de paie** | **MVP simple et explicite** (base contrat ± composants), pas de moteur fiscal complet (barèmes/cotisations légales → reporté). |
| **Pattern CRUD** | Réutilise le pattern MVP de T2a (web). |

---

## 4. Périmètre

### 4.1 Modèles Prisma proposés (MVP — formes indicatives)

Tous tenant-scoped (`tenantId` + index), soft-delete si pertinent, liés à `User(id)`.

| # | Modèle | Champs clés MVP |
|---|---|---|
| 1 | `EmploymentContract` | `userId`, `type` (enum CDI/CDD/VACATAIRE/TEMPS_PARTIEL), `startDate`, `endDate?`, `baseSalary Decimal(10,3)`, `currency "TND"`, `weeklyHours`, `status` (ACTIVE/ENDED) |
| 2 | `LeaveRequest` | `userId`, `type` (enum PAID/SICK/UNPAID/OTHER), `startDate`, `endDate`, `status` (PENDING/APPROVED/REJECTED), `reason`, `reviewedById?`, `reviewedAt?` |
| 3 | `Payslip` | `userId`, `period` (mois, ex. `2026-05`), `grossSalary Decimal(10,3)`, `totalDeductions Decimal(10,3)`, `netSalary Decimal(10,3)`, `currency`, `status` (DRAFT/ISSUED), `issuedAt?` |
| 4 | `PayslipComponent` *(optionnel MVP)* | `payslipId`, `label`, `kind` (EARNING/DEDUCTION), `amount Decimal(10,3)` |

> Solde de congés : **dérivé** (somme des `LeaveRequest` approuvés sur l'année vs. allocation) plutôt qu'un champ stocké, pour éviter la désynchronisation. Allocation annuelle = constante configurable (pas de nouveau modèle en MVP).

### 4.2 Endpoints / surface
- **Personnel** : `GET/POST/PATCH/DELETE` STAFF (extension `staff.controller`) + réutilisation de la liste enseignants (module 1 de T2a).
- **Contrats** : CRUD `EmploymentContract` par employé.
- **Congés** : créer une demande, **approuver/rejeter** (SCHOOL_ADMIN), lister par employé/par statut.
- **Paie** : générer un `Payslip` pour un employé sur une période (calcul MVP), lister, marquer émis. **PDF du bulletin de paie : optionnel** (réutiliserait l'infra `@react-pdf/renderer` des bulletins scolaires) — hors MVP, noté en §9.

### 4.3 RBAC
- **SCHOOL_ADMIN** : CRUD complet personnel/contrats/paie + **approbation** des congés.
- **TEACHER/STAFF** (employés) : **demander** un congé, **consulter** leurs propres contrats/bulletins. *(Surface employé minimale en MVP ; la saisie de congé côté employé peut être web d'abord.)*

### 4.4 Hors-périmètre
- **Moteur fiscal/cotisations légales** (CNSS, IRPP, barèmes Tunisie) → reporté (calcul MVP = base ± composants saisis).
- **Pointage/temps de présence employé** (badgeuse) → hors T2c.
- **Notes de frais, primes complexes, avances** → hors MVP.
- **Aucune modification** de l'isolation, des modèles existants (hors ajout de relations), de la CI, du `package.json` racine.

---

## 5. Architecture & pattern

### 5.1 Backend (NestJS)
Un module **`hr`** (ou modules `contracts` / `leaves` / `payroll` séparés — tranché en `writing-plans`) calqué sur `apps/api/src/students/` (module/controller/service/spec/dto). Services tenant-scoped, `$transaction` pour écritures, RBAC `@Roles`. L'extension d'isolation tenant existante s'applique automatiquement aux nouveaux modèles (`tenantId`).

### 5.2 Web — page `hr` reconstruite
La page `hr` passe de « liste enseignants enrichie au hasard » à un écran à **onglets réels** : **Personnel · Contrats · Congés · Paie**, chacun branché sur `useResource(...)` (pattern T2a), avec états loading/empty/error+retry. **Suppression** de `enrich()`, `SALARIES`, `DEMO_TEACHERS_HR`.

### 5.3 Mobile
RH/Paie est du **back-office administratif → web-first**. Surface mobile **minimale** en T2c : au mieux, **demande de congé** par l'employé (TEACHER/STAFF) et **consultation de bulletin** — *candidats de suivi, hors MVP T2c sauf décision contraire*. Aucun nouvel onglet mobile.

### 5.4 Sécurité & confidentialité
- Salaires/bulletins = **PII sensible** : **jamais en log**, RBAC strict (un employé ne voit que les siens), isolation tenant inchangée (JWT).
- Validation à la frontière (Zod web / class-validator API). Montants en `Decimal` (pas de float).

---

## 6. Gestion d'erreurs & états (identique à T2a)

| État | Comportement (web) |
|---|---|
| Chargement | Skeleton |
| Vide | Message + CTA (« Aucun contrat enregistré pour cet employé ») |
| Erreur | Message + **Réessayer**, jamais avalée |
| Succès mutation | Invalidation cache + toast ; relecture serveur |
| 403 | Action masquée ; message clair si atteinte |

---

## 7. Stratégie de tests & vérification

- **Calcul de paie** : tests unitaires ciblés (base + composants → brut/déductions/net), valeurs en `Decimal`, cas limites (contrat sans fin, temps partiel).
- **Workflow congés** : transitions PENDING → APPROVED/REJECTED testées ; un employé ne peut approuver ses propres congés.
- **Isolation** : test multi-tenant étendu aux modèles RH.
- **Web** : `type-check` local ; lint/build/E2E CI. E2E : créer contrat → demander congé → approuver → générer bulletin → reload (persistance prouvée).
- **API** : Vitest (CI ; bloqué localement par `ERR_DLOPEN_FAILED`).

---

## 8. Plan de livraison en vagues (tranches verticales)

1 PR par vague (ou par modèle), CI verte → merge auto. **Migration = 🛑 validation avant `prisma migrate`.**

- **Vague 1 — Personnel + Contrats** : lister/CRUD STAFF, `EmploymentContract`, page `hr` onglets Personnel + Contrats (fin des données aléatoires).
- **Vague 2 — Congés** : `LeaveRequest` + workflow d'approbation + solde dérivé.
- **Vague 3 — Paie** : `Payslip` (+ composants), calcul MVP, génération/émission. (PDF optionnel en suivi.)

---

## 9. Risques & points d'attention

- **Migrations** : nouveaux modèles RH → **🛑 validation utilisateur** à chaque migration.
- **PII salariale** : confidentialité stricte, jamais loggée, RBAC fin.
- **Tentation du moteur fiscal** : garder le calcul MVP simple ; les barèmes légaux (CNSS/IRPP) sont un projet en soi → explicitement reporté.
- **Cohérence monétaire** : impérativement `Decimal(10,3)`/`TND` comme la finance V8 (pas de float, pas de cents entiers).
- **PDF bulletin de paie** : réutilisable depuis l'infra bulletins scolaires `@react-pdf/renderer` — **optionnel**, hors MVP pour ne pas gonfler le périmètre.
- **Seed** : peupler quelques contrats/congés/bulletins réalistes sur le tenant de démo (idempotent).

---

## 10. Critères d'acceptation T2c

- [ ] Modèles RH créés + migrés (validation 🛑) ; test d'isolation étendu et vert.
- [ ] Personnel STAFF listable/gérable (plus seulement teachers/parents) ; page `hr` **sans `enrich()`/`SALARIES`/`DEMO_TEACHERS_HR`**.
- [ ] Contrats, congés (avec approbation), bulletins de paie fonctionnels et **persistés** sur web ; vérifiés après reload.
- [ ] Montants en `Decimal(10,3)`/`TND` ; salaires jamais en log ; RBAC employé/admin respecté.
- [ ] Données de démo servies par le **seed**, pas par des constantes de page.
- [ ] `type-check` local vert ; CI verte → merge auto par PR.
- [ ] Aucune modification d'isolation, CI, ou `package.json` racine ; migrations explicitement validées.

---

## 11. Suite

Après validation : `superpowers:writing-plans` pour le plan détaillé T2c (par vague : Personnel+Contrats, puis Congés, puis Paie). T2b (modules opérationnels) et T2d (Admin SaaS) ont leurs specs dédiés.
