# T2c — Vague 1 : Personnel + Contrats — Plan d'implémentation

> **Spec :** `docs/superpowers/specs/2026-05-29-t2c-hr-payroll-design.md` (validée 2026-05-30).
> **Track :** T2c (RH / Paie), **Vague 1 / 3** (V1 Personnel+Contrats → V2 Congés → V3 Paie).
> **Branche :** `feat/t2c-v1-personnel-contrats`.
> **Gabarit :** modules opérationnels T2b (PR-1…PR-4) + CRUD MVP T2a.

---

## 1. Objectif de la Vague 1

Remplacer la moitié « personnel » des données fictives de la page `hr` par du réel :
- **lister/gérer les `STAFF`** (aujourd'hui aucun endpoint ne les expose), en plus des teachers déjà couverts ;
- introduire le modèle **`EmploymentContract`** (type, dates, salaire de base `Decimal(10,3)`/`TND`, heures hebdo, statut) lié à un `User` ;
- reconstruire la page `hr` en onglets **Personnel · Contrats** sur données réelles ;
- **supprimer** `enrich()`, `SALARIES`, `LEAVE_BALANCE`, `DEMO_TEACHERS_HR` et la « masse salariale » fictive.

Congés (V2) et Paie (V3) **hors périmètre** de cette vague — les onglets correspondants ne sont pas créés ici.

---

## 2. 🛑 Checkpoint migration Prisma (validation requise AVANT `prisma migrate`)

Cette vague ajoute **un modèle + deux enums**, strictement additifs (aucune table/enum existant modifié) :

```prisma
enum ContractType {
  CDI
  CDD
  VACATAIRE
  TEMPS_PARTIEL
}

enum ContractStatus {
  ACTIVE
  ENDED
}

// T2c V1 — Contrat de travail d'un employé (User TEACHER/STAFF).
model EmploymentContract {
  id          String         @id
  tenantId    String
  userId      String
  type        ContractType
  status      ContractStatus @default(ACTIVE)
  startDate   DateTime
  endDate     DateTime?
  baseSalary  Decimal        @db.Decimal(10, 3)
  currency    String         @default("TND")
  weeklyHours Int?
  notes       String?        @db.Text
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee User   @relation("EmploymentContracts", fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, userId])
  @@map("employment_contracts")
}
```

- `Tenant` : `employmentContracts EmploymentContract[]`.
- `User` : `employmentContracts EmploymentContract[] @relation("EmploymentContracts")`.
- `TENANT_SCOPED_MODELS` (isolation) : ajouter `'EmploymentContract'`.
- Migration **manuscrite** `20260531150000_t2c_employment_contracts/migration.sql` (DB non disponible en local → `ERR_DLOPEN_FAILED` ; appliquée en CI/déploiement, comme les migrations T2b).

**Format monétaire** : `Decimal(10,3)` + `currency` défaut `"TND"`, identique à la finance V8 (pas de float). Salaires = **PII** → jamais loggés.

---

## 3. Tâches (commits atomiques)

### Task 1 — Schéma + isolation (🛑 après validation)
`schema.prisma` (modèle + enums + relations), `tenant.extension.ts` (`EmploymentContract` dans la liste), `prisma format` + `generate` + `type-check`, migration SQL manuscrite.

### Task 2 — Personnel STAFF (extension `staff.controller`)
Ajouter, en miroir des teachers :
- `GET /users/staff` (liste STAFF tenant-scoped)
- `POST /users/staff` (création + `tempPassword`)
- `PATCH /users/staff/:id` (prénom/nom/isActive)
- `DELETE /users/staff/:id` (soft-delete)

DTOs `CreateStaffDto`/`UpdateStaffDto` dans `dto/staff.dto.ts` (réutilisent la forme teacher). RBAC `SCHOOL_ADMIN` (+ `SUPER_ADMIN`). Ajout d'une spec ciblée sur ce nouveau périmètre.

### Task 3 — Module `hr` : Contrats (backend)
`apps/api/src/hr/` calqué sur `students/` :
- `dto/employment-contract.dto.ts` : Create/Update/Response/List. `baseSalary` validé `@IsNumberString`/`@IsDecimal` (string en transport), sérialisé en string dans la réponse (`Decimal.toString()`).
- `contracts.service.ts` : `list({ userId? }, user)`, `getById`, `create`, `update`, `end` (status→ENDED + endDate), `remove` (soft-delete). Tenant-scoped, `findOrThrow`.
- `contracts.controller.ts` : `GET/POST/PATCH/DELETE /hr/contracts`, `POST /hr/contracts/:id/end`.
- `hr.module.ts` (enregistré dans `app.module.ts`).

**RBAC** : `SCHOOL_ADMIN` = CRUD complet. `TEACHER`/`STAFF` = lecture de **leurs propres** contrats uniquement (`list`/`getById` filtrés à `user.id` ; mutations interdites → 403). Implémenté dans le service (si rôle non-admin, force `userId = user.id` et bloque create/update/delete/end).

### Task 4 — Specs unitaires service
`contracts.service.spec.ts` : tenant scoping, `TENANT_REQUIRED`, NotFound, **employé ne lit que les siens**, **employé ne peut pas créer/modifier** (403), `end` met `status=ENDED`.

### Task 5 — Proxies web
`apps/web/app/api/hr/contracts/[[...action]]/route.ts` et `apps/web/app/api/users/staff/[[...action]]/route.ts` (gabarit passthrough existant).

### Task 6 — Client web + schémas Zod
`lib/api/hr.ts` (types + fns staff & contracts) ; `lib/validation/hr.schemas.ts` (`staffSchema`, `employmentContractSchema` — `baseSalary` en string/coerce, dates, enums).

### Task 7 — Page `hr` reconstruite (onglets Personnel + Contrats)
- `app/[locale]/(app)/hr/page.tsx` : 2 onglets (gabarit tabs de la page security PR-4), RBAC `SCHOOL_ADMIN` (employés : V2/V3).
- `components/hr/staff-section.tsx` : liste + CRUD STAFF (+ teachers en lecture ? → **non**, V1 garde la liste teachers existante via module T2a ; cet onglet gère STAFF et affiche le **contrat actif** par employé).
- `components/hr/contracts-section.tsx` : liste contrats + CRUD, badge statut, montant formaté.
- `components/crud/staff-form.tsx`, `components/crud/employment-contract-form.tsx`.
- États loading (skeleton) / vide (CTA) / erreur (retry) ; toasts ; invalidation cache. **Plus aucune donnée en dur.**

### Task 8 — Seed
`seedHr(tenantId)` idempotent : 2–3 `EmploymentContract` réalistes (CDI/CDD, salaires `Decimal` TND) sur les employés existants (teacher/staff/admin) des deux tenants démo. Dates fixes (jamais `Date.now()`).

### Task 9 — E2E + isolation
- `apps/api/test/hr.e2e-spec.ts` : SCHOOL_ADMIN crée contrat (201) ; TEACHER lit le sien, ne voit pas celui d'un autre, ne peut pas créer (403) ; persistance (reload liste admin) ; `:id/end`.
- Étendre `multi-tenant-isolation.e2e-spec.ts` : `EmploymentContract` (findMany scoping + findFirst cross-tenant → null) ; ajouter au cleanup global (avant suppression users, FK `userId`).

### Task 10 — Gate + push + PR
`type-check` (api+web) + `pnpm lint` verts en local ; push ; PR vers `main` ; surveiller CI → merge auto sur vert (merge commit) ; **STOP** (V2 Congés = vague suivante, validation requise).

---

## 4. Hors-périmètre V1
Congés (V2), Paie/bulletins (V3), moteur fiscal (CNSS/IRPP), PDF bulletin, pointage, mobile. Aucune modif d'isolation (hors ajout modèle), CI, ou `package.json` racine.

---

## 5. Critères d'acceptation V1
- [ ] `EmploymentContract` migré (🛑 validé) ; isolation étendue verte.
- [ ] STAFF listable/gérable via `/users/staff`.
- [ ] Page `hr` sans `enrich()`/`SALARIES`/`LEAVE_BALANCE`/`DEMO_TEACHERS_HR` ; contrats persistés, vérifiés après reload.
- [ ] Montants `Decimal(10,3)`/`TND` ; salaires jamais loggés ; RBAC employé/admin respecté (employé lit ses contrats, ne mute pas).
- [ ] Données démo via seed.
- [ ] `type-check` local vert ; CI verte → merge auto.
