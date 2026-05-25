# ADR 0006 — Module Élèves (V2)

**Date** : 2026-05-25
**Statut** : Accepté
**Auteurs** : équipe Klasso

## Contexte

V1.8 a livré la capacité super-admin de provisionner un tenant + admin invite end-to-end. V2 inaugure les modules métier en commençant par l'**entité racine** : l'élève. Toutes les vagues V3-V8 (Parents, Enseignants, Évaluations, Facturation, Cantine/Transport, Santé) dépendent du modèle `Student`.

## Décisions

### D1 — Profondeur des champs : "Complet" (~15 champs)

Choix entre "Minimal" (6 champs) et "Complet" (15 champs incluant nationalité, langue, médical light, photo, adresse). User a tranché "Complet" → +1j effort vs Minimal.

Justification : éviter le remaniement de schema dans 1 mois quand le besoin parents/enseignants pour avoir les contacts urgents apparaîtra.

### D2 — Plateformes : Web full CRUD + Mobile read-only

Web : pages liste / création sectionnée / édition / détail / bulk-import.
Mobile : liste FlatList + détail sectionné read-only seulement. Write mobile reportée V3 (corollaire du module Parents).

Justification : éviter de construire 2 formulaires complexes en parallèle avant que la relation `Parent ↔ Student` (V3) ne soit fixée.

### D3 — RBAC : "Standard métier" (5 rôles × 7 actions)

- `SCHOOL_ADMIN` : full CRUD + bulk-import + photo upload
- `TEACHER` : read all (scoped au tenant)
- `PARENT` : read own children only (scoped par `parentEmail = currentUser.email`)
- `STAFF` : read all (scoped au tenant)
- `SUPER_ADMIN` : pas de cross-tenant ici (utilise `/admin/tenants`)

Implémentation : `@Roles()` decorator (NestJS) côté controller + service-side scoping pour `PARENT` (filtré par parentEmail). **JAMAIS** de scoping client-side.

### D4 — Bulk CSV import

Endpoint `POST /students/bulk-import` avec `dryRun` mode (preview erreurs sans insertion). Critique pour onboarding des écoles avec >50 élèves existants. Limite 1000 lignes / 5 MB par upload. Atomicité forte : 1 erreur sur n'importe quelle ligne ⇒ 0 insert (transaction Prisma).

Stack : `csv-parse` (sync, ~50 KB gzipped) + `zod` row-schema (~12 KB gzipped). Sous le threshold CLAUDE.md (100 KB / dep).

## Alternatives rejetées

- **Entité `Class` relationnelle dès V2** : rejeté → `classroom: string` libre, V4 introduira `Class` quand le module Enseignants & Emplois du temps arrivera. Migration data V4 mappera les strings vers les nouvelles entités.

- **Relation `Parent` N-N avec `Student` dès V2** : rejeté → `parentEmail: string` est une simple référence textuelle. V3 introduira la table `Parent` + table de jointure `ParentStudent`. Script migration `migrate-parent-emails-to-relations.ts` matchera les `student.parentEmail` aux nouveaux `User(role=PARENT)`.

- **Médical strict / PHI fort dès V2** : rejeté → `medicalNotes` est un free text optionnel avec warning RGPD UI (bandeau ambre). V8 (Module Santé) introduira allergies structurées, traitements, urgences avec PHI fort + chiffrement at-rest.

- **Mobile write CRUD dès V2** : rejeté → réduit la surface mobile à read-only pour rester simple et focus sur l'UX parent (qui dominera la consommation mobile en V3).

## Conséquences

### Positives

- Onboarding écoles facile : CSV bulk = 100 élèves en 1 clic + preview dry-run.
- Réutilisation totale du pattern R2 V1.6 pour photo upload (zéro nouveau service infra).
- Test d'isolation R10 étendu (4 tests Student dans `multi-tenant-isolation.e2e-spec.ts`) → confiance multi-tenant.
- Premier module métier livré clé en main pour démos commerciales TN/MENA.

### Négatives / migration future

- **`parentEmail: string`** : à migrer V3 quand `Parent` devient une entité relationnelle.
- **`classroom: string`** : à migrer V4 quand `Class` devient relationnel avec emploi du temps.
- **`medicalNotes` PHI light** : à reclassifier V8 avec champs structurés + chiffrement at-rest.

### Effort

- Initial roadmap : 3j
- Réel : ~6j (scope étendu : Complet vs Minimal + bulk import + photo + mobile)

## Références

- Spec : `docs/superpowers/specs/2026-05-25-v2-eleves-module-design.md`
- Plan : `docs/superpowers/plans/2026-05-25-v2-eleves-module.md`
- Pattern R2 réutilisé : `apps/api/src/tenant-brand/tenant-brand.service.ts` (V1.6)
- Isolation infra : `apps/api/src/common/prisma/tenant.extension.ts` (V1 phase D, étendue V2 phase A)
- Lock décision : D24 dans `docs/roadmap.md`
