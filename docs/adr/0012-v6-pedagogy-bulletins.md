# 0012 — V6 Pédagogie + Bulletins PDF

**Date:** 2026-05-26
**Status:** Accepted (D32)
**Deciders:** User

## Context

Klasso a, à la fin V4, des classes + EDT mais aucun module de notation. V6
introduit le gradebook (Subject, GradePeriod, Evaluation, Grade) ainsi que la
génération de bulletins PDF par élève + période.

## Decision

### Models V6 (D32 lock — server-side PDF via @react-pdf/renderer)

- **`Subject`** — matière référencée par tenant. Unique `(tenantId, name)`. Soft-delete via `deletedAt`.
- **`GradePeriod`** — période de notation (T1/T2/T3 ou S1/S2). Unique `(tenantId, schoolYear, name)`. `isClosed=true` interdit la création/modification de Grade mais n'empêche pas la regénération du bulletin.
- **`Evaluation`** — un contrôle / devoir d'une classe + matière dans une période. `maxScore` libre (échelle quelconque). **Pas de coefficient en V6** (V6-B pour pondération).
- **`Grade`** — note d'un élève à une évaluation. Unique `(evaluationId, studentId)`. `0 ≤ score ≤ evaluation.maxScore`.
- **`Bulletin`** — snapshot Json + métadonnées de génération pour un (élève, période). Unique `(studentId, gradePeriodId)`.

Rejected — modèles plus granulaires (TermAverage, SubjectAverage tables matérialisées) : surcoût migrations sans bénéfice V6, calculs simples à la volée et snapshotés dans `Bulletin.data`.

### Rendu PDF — @react-pdf/renderer (D32 lock)

- Bibliothèque retenue : `@react-pdf/renderer` ^4.x. Server-side, JSX-like, ~200KB, fonctionne sur Railway et Vercel runtime Node.
- `BulletinPdfService.render(props)` enveloppe `renderToBuffer()`. Template React dans `bulletins/templates/bulletin-document.tsx`.
- Le PDF est retourné directement (`Content-Type: application/pdf`) dans la réponse `POST /bulletins/generate` — pas de stockage R2 obligatoire en V6 (V6-B).

Rejected — `puppeteer` / `playwright` (lourd Chromium, problématique serverless), `pdfkit` (bas niveau, mauvais layout), wkhtmltopdf (binaire système).

### Calcul des moyennes

- Moyenne par matière = moyenne arithmétique simple de `(score / maxScore) * 20` sur toutes les notes du student dans cette matière sur la période. **Pas de pondération en V6** — V6-B.
- Moyenne générale = moyenne des moyennes par matière (matières sans note ignorées).
- 0 note → `overallAverage = null`, snapshot `subjects = []`. PDF affiche "Aucune note enregistrée".

### Students ↔ Class (V6 only)

Pas encore de FK `Student.classId` (V4-B). En attendant, on matche
`student.classroom == class.name && student.tenantId == class.tenantId`.
Trade-off : si la `classroom` string n'a pas été migrée, le bulletin est vide.

### API surface

```
GET    /api/subjects                              list (RW SCHOOL_ADMIN, R TEACHER+STAFF)
POST   /api/subjects                              create (SCHOOL_ADMIN)
PATCH  /api/subjects/:id                          update
DELETE /api/subjects/:id                          soft-delete

GET    /api/grade-periods                         list (?schoolYear=)
POST   /api/grade-periods                         create (SCHOOL_ADMIN)
PATCH  /api/grade-periods/:id                     update
POST   /api/grade-periods/:id/close               close period

GET    /api/evaluations                           list (?classId, ?gradePeriodId, ?subjectId)
POST   /api/evaluations                           create (SCHOOL_ADMIN, TEACHER on own classes)
GET    /api/evaluations/:id                       detail + grades
PATCH  /api/evaluations/:id                       update
DELETE /api/evaluations/:id                       delete
PUT    /api/evaluations/:id/grades                upsert grade for one student
DELETE /api/evaluations/:id/grades/:studentId     delete grade

POST   /api/bulletins/generate                    generate PDF (returns application/pdf)
GET    /api/bulletins/:studentId/:periodId/latest latest bulletin metadata
```

### Tenant isolation

Chaque table V6 a `tenantId` et toutes les queries forcent `tenantId: user.tenantId`. Aucun endpoint cross-tenant — SUPER_ADMIN reporté V11.

### TEACHER scope

Les TEACHER ne peuvent créer/modifier les Evaluation et Grade que sur les Class
où ils ont une ligne `ClassTeacher` (peu importe la matière de cette ligne — granularité
par matière sera V6-B).

## Consequences

**Positive :**
- Stack PDF minimal, déployable partout où Node tourne.
- Snapshot Json côté `Bulletin.data` permet la regénération identique post-publication.
- Modèles isolés des modèles V1–V4 — pas de migration risquée des données existantes.

**Negative :**
- Pas de pondération matière (V6-B) — incomplet pour les écoles utilisant des coefficients.
- Pas de commentaires textuels enseignant (V6-B).
- Pas de notifications parents quand un bulletin est publié (V9 multi-canal).
- Pas d'accès parent à la lecture des notes / bulletin (V6-B).
- Le matching student ↔ class par string `classroom` peut donner un bulletin vide si les classrooms n'ont pas été migrées.

## V6 explicit out-of-scope (V6-B / V9)

- Moyennes pondérées par matière (V6-B)
- Coefficient par évaluation (V6-B)
- Commentaire enseignant sur bulletin (V6-B)
- Notifications push/email parents (V9)
- Accès lecture parent aux notes + téléchargement bulletin (V6-B)
- Persona TEACHER : page "Mes classes" + raccourci saisie (V6-B / V4-B)
- Upload R2 du PDF + URL persistée (V6-B)
- Migration `Student.classId` (V4-B)

## References

- Migration: `apps/api/prisma/migrations/20260526230000_v6_pedagogy_bulletins/`
- Backend: `apps/api/src/subjects/`, `grade-periods/`, `evaluations/`, `bulletins/`
- PDF template: `apps/api/src/bulletins/templates/bulletin-document.tsx`
- Frontend: `apps/web/app/[locale]/(app)/classes/[id]/grades/`, `students/[id]/bulletin/`
- Proxies: `apps/web/app/api/{subjects,grade-periods,evaluations,bulletins}/[...action]/route.ts`
- Plan: `docs/superpowers/plans/2026-05-26-v6-pedagogy-bulletins.md`
