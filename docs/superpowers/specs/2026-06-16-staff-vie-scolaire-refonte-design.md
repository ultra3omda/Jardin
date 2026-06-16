# Design — Refonte UX STAFF / Vie scolaire (Vague 4)

> **Statut** : **complète** — sweep états mobile vie-scolaire (8 fichiers) livré (PR #220). Web déjà moderne.
> **Programme** : refonte UX par persona. Vague 4 = **STAFF / Vie scolaire**.
> **Fondations** : Phase 0 + Vagues 1-3 (primitives, gabarits).

## 1. Constat (mapping 2026-06-16)
- **Web** : les 7 modules opérationnels vie-scolaire (journal, activités, discipline, santé,
  cantine, transport, sécurité) utilisent **déjà** le gabarit `ResourceListPage` (états standard).
  **Aucune refonte web nécessaire.**
- **Mobile** : les écrans `manage/*` vie-scolaire utilisent déjà `EmptyState`/`Fab`/`FormSheet`/
  `ConfirmDialog`, **mais** gardent `ActivityIndicator` au chargement et une **erreur en `<Text>`
  brut sans retry** (ni `Skeleton`, ni `ErrorState`). C'est le seul écart restant.
- **Dashboard STAFF** (web + mobile) : déjà moderne. **Hors scope** (confirmé).

## 2. Périmètre (un seul PR — sweep mobile)
Refondre l'état chargement/erreur des écrans mobile vie-scolaire :
`manage/{activities, canteen, transport, discipline, health, security}` (+ tabs sécurité s'il y a
lieu). **Refonte UX pure** : `ActivityIndicator` → groupe `Skeleton` ; erreur `<Text>` → `ErrorState`
+ retry (`refetch`). `EmptyState`, formulaires (`FormSheet`), mutations, `ConfirmDialog` : **inchangés**.
**Aucun backend.**

**Hors scope** : écrans manage non-vie-scolaire (RH, finance, caisse, unpaid, directory, classes,
subjects, imports, settings, appointments) ; `observations` (formulaire, pas de loading) ; web (déjà moderne).

## 3. Transformation (canonique)
```tsx
// avant
const { data, isLoading, isError } = useX();
// …
{isLoading ? (
  <ActivityIndicator color={colors.ambre[500]} style={{ marginTop: 24 }} />
) : isError ? (
  <Text style={{ color: colors.status.danger500 }}>Erreur de chargement.</Text>
) : items.length === 0 ? ( <EmptyState … /> ) : ( …liste… )}

// après
const { data, isLoading, isError, refetch } = useX();
import { …, ErrorState, Skeleton } from '@klasso/ui-mobile'; // ActivityIndicator retiré si inutilisé
{isLoading ? (
  <View style={{ gap: 10 }} accessibilityRole="progressbar">
    {[0, 1, 2].map((i) => <Skeleton key={i} height={72} radius={radius.lg} />)}
  </View>
) : isError ? (
  <ErrorState message="Impossible de charger." onRetry={() => { void refetch(); }} />
) : items.length === 0 ? ( <EmptyState … /> ) : ( …liste… )}
```

## 4. Tests
`type-check` mobile (install `--frozen-lockfile`). Présentationnel → lint/tests en CI. Pas d'e2e
mobile (Maestro non configuré, cf. CLAUDE.md).

## 5. Risques
- Sweep multi-fichiers → vérifier que `ActivityIndicator` n'est retiré de l'import QUE s'il n'est plus
  utilisé ailleurs (ex. spinner de bouton) ; sinon le garder.
- Mutations/forms/`ConfirmDialog` strictement préservés.
