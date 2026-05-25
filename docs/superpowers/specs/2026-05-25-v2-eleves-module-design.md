# V2 — Module Élèves CRUD (Web full + Mobile read-only) — Spec

**Date** : 2026-05-25
**Statut** : Draft (en attente validation user)
**Référence roadmap** : V2 — modifie estimation 3j → ~5-6j (scope inflation post-décisions user)

---

## 1. Contexte et objectif

### 1.1 Pourquoi maintenant

V1.8 vient de livrer la capacité pour un `SUPER_ADMIN` de provisionner une école end-to-end (tenant + admin invité + URLs preview). À ce stade, **une école Klasso fraîchement créée est techniquement fonctionnelle mais vide** : aucune donnée métier n'existe encore.

V2 inaugure les **modules métier** en commençant par **l'entité racine de tout le système scolaire** : l'élève. Toutes les vagues ultérieures (Parents V3, Enseignants V4, Évaluations V6, Facturation V7, Cantine/Transport V8) dépendent du modèle Student.

### 1.2 Objectif V2

Livrer un **CRUD Élèves production-ready** :

1. **Backend** : API REST complète multi-tenant + bulk CSV import + upload photo R2
2. **Web** : pages liste/création/édition/détail full CRUD pour `SCHOOL_ADMIN`, vues read-only adaptées par rôle (`TEACHER`, `PARENT`, `STAFF`)
3. **Mobile** : vues read-only liste + détail (write CRUD reportée V3 avec module Parents)
4. **RBAC** standard métier (5 rôles × 7 actions, matrice détaillée section 3.5)
5. **Isolation multi-tenant** vérifiée par test automatique (CLAUDE.md R10)

### 1.3 Hors scope V2 (volontaire)

- ❌ Entité `Class` relationnelle (V4 — Module Enseignants & Emplois du temps). En V2, `classroom` est un `string` libre.
- ❌ Relation `Parent` N-N avec `Student` (V3). En V2, `parentEmail: string` est une simple référence textuelle.
- ❌ Médical strict / PHI fort (V8 — Module Santé). En V2, `medicalNotes` est un free-text optionnel avec warning RGPD.
- ❌ CSV templates UI téléchargeables + import dry-run preview avancé (V11 hardening).
- ❌ Recherche full-text (`tsvector` Postgres) — V2 = filtre `ILIKE` simple sur `lastName`/`firstName` (V11 search avancée).
- ❌ Mobile write CRUD (V3 — corollaire du module Parents qui ouvre l'écriture côté mobile).
- ❌ Export PDF fiche élève (V11 reporting).

---

## 2. Décisions actées (via AskUserQuestion 2026-05-25)

| # | Question | Décision user | Implication |
|---|----------|---------------|-------------|
| Q1 | Profondeur champs | **Complet** (~15 champs : identité + scolarité + famille + adresse + langue + médical light + photo) | +1 jour vs Minimal (6 champs). Voir schema 3.1. |
| Q2 | Plateformes | **Web full CRUD + Mobile read-only** (parallèle) | Mobile write reportée V3. Évite double-build form complexe avant que Parent N-N existe. |
| Q3 | RBAC | **Standard métier** (5 rôles différenciés, voir 3.5) | TEACHER read-only, PARENT scoped par `parentEmail`, SCHOOL_ADMIN full, STAFF read. SUPER_ADMIN via `/admin` V1.8 séparé (pas de cross-tenant ici). |
| Q4 | Bonus | **+ Bulk CSV import** (POST endpoint + UI web + validation + error report) | +0.5j. Critique pour onboarding écoles avec >50 élèves. |

**Effort total révisé** : ~5-6j (vs 3j roadmap initial). Acceptation user au moment de la validation de cette spec.

---

## 3. Architecture

### 3.1 Data model — Prisma `Student`

Nouveau modèle dans `apps/api/prisma/schema.prisma` :

```prisma
enum Sex {
  M
  F
}

model Student {
  id                String     @id // cuid2 (cohérent avec User, Tenant)
  tenantId          String

  // — Identité —
  firstName         String
  lastName          String
  dateOfBirth       DateTime   @db.Date
  sex               Sex
  nationality       String?    // ISO 3166-1 alpha-2 (ex: 'TN', 'FR', 'DZ')

  // — Scolarité —
  classroom         String     // V2: string libre (ex: "CP-A"). V4: relation Class
  enrollmentDate    DateTime   @db.Date @default(now())
  previousSchooling String?    @db.Text // antécédents scolaires (free text)

  // — Famille —
  parentEmail       String     // V2: string ref. V3: relation Parent N-N
  siblingsCount     Int        @default(0)

  // — Contact —
  addressLine       String?
  city              String?
  postalCode        String?
  country           String?    @default("TN")

  // — Langue —
  motherTongue      String?    // ISO 639-1 (ex: 'ar', 'fr', 'en')

  // — Santé (light V2, médical strict V8) —
  medicalNotes      String?    @db.Text // allergies, traitements légers — warning RGPD côté UI

  // — Photo —
  photoUrl          String?    // R2 public URL (signed à l'upload, public à la lecture)

  // — Méta —
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  deletedAt         DateTime?  // soft-delete

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, lastName])
  @@index([tenantId, classroom])
  @@index([tenantId, parentEmail])
  @@map("students")
}
```

**Justifications design** :
- `cuid2` plutôt qu'UUID : cohérence avec `User`/`Tenant` existants + URL-safe + plus courts
- `@db.Date` (pas `DateTime`) pour `dateOfBirth` et `enrollmentDate` : pas de fuseau horaire à gérer
- Soft-delete (`deletedAt`) : préserver l'historique (notes, paiements futurs V7 référenceront le student même supprimé)
- 3 index composites `(tenantId, X)` : toutes les queries sont déjà scopées tenant via extension Prisma
- `medicalNotes` en `@db.Text` : peut contenir paragraphes ; warning UI obligatoire (cf. R4)

**Extension `tenantPrisma`** :
Ajouter `"Student"` dans `TENANT_SCOPED_MODELS` (`apps/api/src/prisma/tenant.extension.ts`) → toutes les queries `prisma.student.*` seront auto-filtrées par `tenantId` du contexte request.

### 3.2 Backend API — endpoints

```
POST   /api/students                        SCHOOL_ADMIN              → create (1 élève)
GET    /api/students                        tous rôles authentifiés   → list paginée (RBAC-filtered)
GET    /api/students/:id                    tous rôles (RBAC-checked) → detail
PATCH  /api/students/:id                    SCHOOL_ADMIN              → partial update
DELETE /api/students/:id                    SCHOOL_ADMIN              → soft-delete (deletedAt = now())
POST   /api/students/bulk-import            SCHOOL_ADMIN              → multipart CSV upload + dry-run
POST   /api/students/:id/photo-upload-url   SCHOOL_ADMIN              → R2 signed PUT URL
```

**Détails sélection / filtres GET /students** :
- Query params : `?page=1&pageSize=20&search=<term>&classroom=<string>&sortBy=lastName&sortOrder=asc`
- `search` → `ILIKE %term%` sur `firstName` OR `lastName`
- Response : `{ data: Student[], total: number, page: number, pageSize: number }`
- Default sort : `lastName ASC, firstName ASC`
- `deletedAt IS NULL` toujours appliqué (soft-delete invisible)

**Détails POST /bulk-import** :
- Content-Type : `multipart/form-data` (champ `file`)
- Mode `?dryRun=true` (default) → parse + valide tous les lignes, retourne `{ valid: [...], errors: [{ row, message }] }`, **n'écrit pas en DB**
- Mode `?dryRun=false` → écrit en DB (rollback transactionnel si une seule ligne échoue après validation)
- Format CSV attendu (header obligatoire ligne 1) :
  ```
  firstName,lastName,dateOfBirth,sex,classroom,parentEmail,nationality,city,country,motherTongue,siblingsCount
  Amine,Ben Salah,2017-09-15,M,CP-A,parent@ex.tn,TN,Tunis,TN,ar,1
  ```
- Limite : 1000 lignes par upload (au-delà, 413 Payload Too Large)
- Tous les champs optionnels du modèle Prisma peuvent être omis

**Détails POST /:id/photo-upload-url** :
- Réutilise pattern V1.6 (`apps/api/src/tenant-brand/tenant-brand.service.ts:generatePresignedUploadUrl`)
- Path R2 : `students/{tenantId}/{studentId}.{ext}` (jpg/png/webp)
- TTL signed URL : 5 minutes
- Response : `{ uploadUrl, publicUrl, expiresAt }`
- Le client web fait `PUT` direct R2, puis `PATCH /students/:id { photoUrl: publicUrl }`
- Validation MIME côté web avant PUT (extra safety)

### 3.3 Frontend Web — pages et composants

**Nouvelles routes** (sous `apps/web/app/(app)/students/`) :

```
/students                  → liste paginée + search + filtres
/students/new              → formulaire création (sectionné)
/students/[id]             → détail (read-only view + actions selon RBAC)
/students/[id]/edit        → formulaire édition (même composant que /new)
/students/import           → UI bulk CSV import (upload + preview dry-run + confirm)
```

**Layout existant** : reuse `apps/web/app/(app)/layout.tsx` (header + auth guard déjà en place).

**Composants à créer** (`apps/web/components/students/`) :
- `StudentList` : table TanStack Query + pagination + search + filtres
- `StudentForm` : react-hook-form + zod, **form sectionné** :
  - Section 1 — **Identité** : firstName, lastName, dateOfBirth, sex, nationality, motherTongue
  - Section 2 — **Scolarité** : classroom, enrollmentDate, previousSchooling
  - Section 3 — **Famille** : parentEmail, siblingsCount
  - Section 4 — **Adresse** : addressLine, city, postalCode, country
  - Section 5 — **Santé** ⚠️ : medicalNotes (avec warning RGPD bandeau jaune avant ouverture)
  - Section 6 — **Photo** : `PhotoUploadWidget` (preview + R2 signed PUT)
- `StudentCard` : carte récap dans /detail (affiche photo + identité + classe + parent + actions RBAC-gated)
- `PhotoUploadWidget` : `<input type="file">` → POST `/photo-upload-url` → PUT R2 → PATCH student
- `BulkImportWizard` : 3 étapes (upload CSV → preview dry-run → confirm import)
  - Étape 1 : drop CSV
  - Étape 2 : table `valid: N` / `errors: M` avec scroll des erreurs (row, message)
  - Étape 3 : bouton "Confirmer l'import de N élèves" → POST `?dryRun=false`

**Header navigation** (`apps/web/components/layout/Header.tsx`) :
- Ajouter lien "Élèves" → `/students` (visible pour tous les rôles authentifiés, sauf SUPER_ADMIN qui voit `/admin`)
- Style : actif si `pathname.startsWith('/students')`

**Bouton Actions sur /students** (RBAC) :
- `SCHOOL_ADMIN` voit : `[+ Nouvel élève]` `[Import CSV]`
- Autres rôles : pas de boutons (read-only)

### 3.4 Frontend Mobile — read-only

**Nouvelles routes** (`apps/mobile/app/(app)/students/`) :

```
(app)/students/index.tsx       → liste FlatList
(app)/students/[id].tsx        → détail
```

**Stack** : Expo Router + NativeWind + TanStack Query (déjà en place V1.7-A).

**Composants** :
- `StudentListScreen` : FlatList virtualisée + pull-to-refresh + search bar simple + pagination infinite scroll
- `StudentDetailScreen` : ScrollView avec sections (identité, scolarité, famille, adresse) — NativeWind cards
- Pas de form édition. Pas de bouton "+ Nouveau". Pas de bouton "Supprimer".

**RBAC mobile** :
- Tous rôles authentifiés voient la liste (filtrée selon role identique au web)
- Pas de menu admin (le mobile n'expose pas `/admin/*`)

**Performance target** : list rendering ≤ 1s sur réseau 4G TN (cf. acceptance criteria).

### 3.5 RBAC matrix

| Action          | SCHOOL_ADMIN | TEACHER     | PARENT                                 | STAFF       | SUPER_ADMIN |
|-----------------|--------------|-------------|----------------------------------------|-------------|-------------|
| Create          | ✅           | ❌ 403      | ❌ 403                                 | ❌ 403      | ❌ (use `/admin`) |
| List            | ✅ all       | ✅ all      | ✅ where `parentEmail = user.email`    | ✅ all      | n/a |
| Read detail     | ✅           | ✅          | ✅ if `parentEmail = user.email`       | ✅          | n/a |
| Update          | ✅           | ❌ 403      | ❌ 403                                 | ❌ 403      | ❌ |
| Delete          | ✅           | ❌ 403      | ❌ 403                                 | ❌ 403      | ❌ |
| Bulk import     | ✅           | ❌ 403      | ❌ 403                                 | ❌ 403      | ❌ |
| Photo upload    | ✅           | ❌ 403      | ❌ 403                                 | ❌ 403      | ❌ |

**Implémentation** :
- Decorator `@Roles(UserRole.SCHOOL_ADMIN)` sur les actions write
- Guard custom `StudentReadScopeGuard` qui injecte `WHERE parentEmail = currentUser.email` quand `role === PARENT`
- Audit log : `student.created`, `student.updated`, `student.deleted`, `student.bulk_imported`, `student.medical_notes_accessed` (PHI light tracking)

### 3.6 CSV import flow détaillé

```
[1] User clic "Import CSV" sur /students
   ↓
[2] /students/import : drop zone fichier
   ↓
[3] FE POST /api/students/bulk-import?dryRun=true (multipart)
   ↓
[4] BE : parse CSV (papaparse) → validate chaque ligne (zod schema) → return {valid, errors}
   ↓
[5] FE affiche tableau preview :
    - "✅ 87 élèves valides"
    - "❌ 13 erreurs" → liste scrollable (row N : message)
   ↓
[6] Si errors > 0 : user peut "Annuler" ou "Importer les 87 valides quand même"
   ↓
[7] User clic "Confirmer" → FE POST même endpoint avec ?dryRun=false
   ↓
[8] BE : transaction Prisma → insert N students → return {imported: N}
   ↓
[9] FE redirige vers /students avec toast "✅ 87 élèves importés"
```

**Validation par ligne (zod)** :
- `firstName`, `lastName`, `parentEmail`, `classroom` : required, non-empty
- `dateOfBirth` : format `YYYY-MM-DD`, parsable, date < today
- `sex` : enum `'M' | 'F'`
- `parentEmail` : format email valide
- `nationality`, `country` : ISO 3166-1 alpha-2 si présent (regex `^[A-Z]{2}$`)
- `motherTongue` : ISO 639-1 si présent (regex `^[a-z]{2}$`)
- `siblingsCount` : integer >= 0

### 3.7 Photo upload (R2 signed URLs)

Réutilise infra V1.6 (`tenant-brand.service.ts`) :

```
[1] FE : user sélectionne fichier (drag/click)
   ↓
[2] FE valide MIME (jpg/png/webp) + size (max 5MB)
   ↓
[3] FE POST /api/students/:id/photo-upload-url
   → Response : { uploadUrl, publicUrl, expiresAt }
   ↓
[4] FE PUT direct vers `uploadUrl` (R2) avec le file blob
   ↓
[5] FE PATCH /api/students/:id { photoUrl: publicUrl }
   ↓
[6] UI rafraîchit (TanStack Query invalidate)
```

**Fallback (R2)** : si pas de photo → composant `<StudentAvatar>` affiche initiales (firstLetter + firstLetter prénom/nom) avec background couleur dérivée d'un hash du `id`.

---

## 4. Découpage en tâches (Phases A-I)

| Phase | Scope | Effort | Dépendances |
|-------|-------|--------|-------------|
| **A** | Prisma migration `Student` + `Sex` enum + 3 index + extend `TENANT_SCOPED_MODELS` | 0.5j | V1 multi-tenant infra |
| **B** | Backend `StudentsService` + `StudentsController` + DTOs (`CreateStudentDto`, `UpdateStudentDto`, `ListStudentsQueryDto`) + 8 unit tests (service) + e2e (CRUD + RBAC matrix complète + isolation) | 1.5j | A |
| **C** | Backend `POST /bulk-import` : papaparse + zod schema row + dry-run mode + transaction insert + tests (3 fichiers fixtures : valid / partial-errors / total-errors) | 0.5j | B |
| **D** | Backend `POST /:id/photo-upload-url` : factoring R2 helper depuis `tenant-brand.service.ts` vers `apps/api/src/r2/r2.service.ts` partagé + endpoint + test e2e | 0.3j | V1.6 R2 infra |
| **E** | Web : `/students` list page + `StudentList` component + TanStack Query hook + search bar + pagination + RBAC button visibility | 0.7j | B |
| **F** | Web : `/students/new` + `/students/[id]/edit` + `StudentForm` sectionné (6 sections) + zod validation + `PhotoUploadWidget` + RGPD warning bandeau | 1j | B, D, E |
| **G** | Web : `/students/[id]` detail view + `StudentCard` + delete confirmation modal + `/students/import` `BulkImportWizard` 3 étapes | 0.7j | E, F, C |
| **H** | Mobile : `(app)/students/index.tsx` (FlatList + search + pagination) + `(app)/students/[id].tsx` (ScrollView sections) + tab "Élèves" dans bottom nav | 0.5j | B |
| **I** | Test isolation multi-tenant étendu Student (CLAUDE.md R10) + ADR `0006-student-data-model.md` + roadmap D24 décision lock + README modules + PR finale | 0.3j | tous |

**Total estimé** : ~6 jours (vs 3j roadmap initial → +3j de scope inflation acceptée user).

---

## 5. Acceptance criteria

### 5.1 Backend
- [ ] `pnpm --filter=api prisma migrate dev` applique migration `Student` sans erreur
- [ ] `pnpm --filter=api test` : tous les unit tests passent, coverage `students/*` ≥ 80%
- [ ] `pnpm --filter=api test:e2e` : RBAC matrix testée (chaque rôle × chaque endpoint) + isolation tenant
- [ ] Test isolation : `tenant A` ne peut JAMAIS lire/update/delete un `Student` de `tenant B` (R10)
- [ ] Swagger `/api/docs` documente les 7 endpoints

### 5.2 Web
- [ ] `SCHOOL_ADMIN` crée un élève via form sectionné — toutes les sections fonctionnent
- [ ] Photo upload : preview avant save, persistance R2 OK, fallback initiales si pas de photo
- [ ] Bulk CSV import : 100 élèves importés en 1 clic, dry-run preview affiche erreurs ligne par ligne
- [ ] `TEACHER` ouvre `/students` : voit la liste, aucun bouton create/edit/delete
- [ ] `PARENT` ouvre `/students` : voit uniquement ses enfants (filtré `parentEmail = user.email`)
- [ ] `STAFF` voit tous les élèves, read-only

### 5.3 Mobile
- [ ] Liste élèves rendue en < 1s sur 4G TN (test manuel via test build EAS dev)
- [ ] Detail screen affiche toutes les sections sans crash
- [ ] Pas de bouton "+" / "Edit" / "Delete" (read-only enforce)
- [ ] Pull-to-refresh fonctionne

### 5.4 Qualité
- [ ] `pnpm lint && pnpm type-check && pnpm build` passe partout
- [ ] CI GitHub Actions verte → **auto-merge** sur `main` (CLAUDE.md règle 9)
- [ ] ADR `docs/adr/0006-student-data-model.md` créé
- [ ] Roadmap `docs/roadmap.md` : V2 row mise à jour avec D24 lock

---

## 6. Risques

| # | Risque | Mitigation |
|---|--------|------------|
| **R1** | Scope creep (user a déjà choisi "Complet" → 15 champs) | Accepter, +1j budgété. Pas de re-négociation pendant exec. |
| **R2** | Photo R2 upload échec (CORS R2, MIME invalide, network) | Fallback `<StudentAvatar>` initiales coloré. Retry button UI. Log Sentry `student.photo_upload.failed`. |
| **R3** | CSV malformatted en prod (utilisateur upload Excel mal exporté) | Dry-run mode **obligatoire avant commit** côté UI. Endpoint refuse `?dryRun=false` direct sans preview précédent (header `X-Import-Reviewed: true` requis). |
| **R4** | `medicalNotes` = données de santé (PHI) → exposure RGPD | (a) Bandeau warning UI avant ouverture section Santé. (b) Audit log `student.medical_notes_accessed` à chaque lecture (V8 enforce stricter). (c) Pas d'export CSV de medicalNotes (export V11 filtrera ce champ). |
| **R5** | `parentEmail: string` devient obsolète V3 (Parent N-N relation) | Migration data plan V3 : script `migrate-parent-emails-to-relations.ts` qui matche tous les `student.parentEmail` aux nouveaux `User(role=PARENT)`. Documenté dans ADR 0006. |
| **R6** | Isolation tenant fail sur nouveau modèle Student (R10 CLAUDE.md) | Test e2e dédié `multi-tenant-isolation.e2e-spec.ts` étendu : créer tenant A + élève, créer tenant B, login admin B, GET/POST/PATCH/DELETE → tous 403/404. |
| **R7** | Performance liste avec 1000+ élèves par école | Pagination cursor V11 (pour V2, page-based suffit avec `pageSize` max 100 + index `(tenantId, lastName)`). |

---

## 7. Roadmap update (D24 à ajouter dans `docs/roadmap.md`)

Mise à jour ligne V2 :

| Vague | Scope | Effort | Statut |
|-------|-------|--------|--------|
| **2** | Module Élèves — Web full CRUD + Mobile read-only + Bulk CSV import + RBAC 5 rôles + Photo R2 | ~5-6j | 📋 V2 |

**D24 lock à insérer** :
> **Décision utilisateur 2026-05-25** : V2 = Module Élèves. Scope étendu vs roadmap initial : champs **Complet** (~15 champs incluant nationalité, adresse, langue maternelle, médical light, photo), **Web full CRUD + Mobile read-only** (mobile write reportée V3 avec Parents), **RBAC standard métier** (SCHOOL_ADMIN write / TEACHER+STAFF read all / PARENT read own children / SUPER_ADMIN via /admin), **+ Bulk CSV import** (POST + UI dry-run + error report). Effort estimé ~5-6j vs 3j initial.

---

## 8. Hors scope (rappel — déjà mentionné §1.3, regroupé ici pour validation explicite)

- ❌ Entité `Class` relationnelle → **V4** (Module Enseignants + Emplois du temps)
- ❌ Relation `Parent` N-N avec `Student` → **V3** (Module Parents)
- ❌ Médical strict (allergies structurées, traitements, urgences, PHI fort) → **V8** (Module Santé)
- ❌ CSV templates téléchargeables UI + import preview avancé → **V11** (Hardening)
- ❌ Recherche full-text `tsvector` Postgres → **V11** (Search avancée)
- ❌ Mobile write CRUD (form, upload photo, edit) → **V3**
- ❌ Export PDF fiche élève + reporting consolidé → **V11**

---

## 9. Validation utilisateur attendue

- [ ] Le scope V2 te convient (5-6j vs 3j roadmap initial — décision Complet validée) ?
- [ ] La matrice RBAC §3.5 reflète bien ton intention métier (notamment PARENT scoped par email V2) ?
- [ ] Pas d'oubli majeur sur les 15 champs Student (nationalité ISO ? mère tongue ISO ?) ?
- [ ] OK pour démarrer le plan détaillé (issues GitHub par Phase A-I) + execution immédiat après ton GO ?
