# Comptes de démonstration Klasso

> Données peuplées par `apps/api/prisma/seed.ts` (idempotent). Noms tunisiens réalistes.

## Mot de passe
- **Tous les comptes démo partagent un seul mot de passe.**
- Définis `DEMO_PASSWORD` (≥ 12 caractères) avant le seed pour un mot de passe **stable et connu** :
  ```bash
  DEMO_PASSWORD="KlassoDemo2026!" pnpm --filter @ecole-saas/api prisma db seed
  ```
- Sans `DEMO_PASSWORD`, un mot de passe aléatoire est généré et **imprimé en fin de seed**.
- Un re-seed met à jour le hash de **tous** les comptes sur le `DEMO_PASSWORD` courant (pas de divergence).

## Comptes — École primaire (`demo-ecole`, PRIMARY_SCHOOL)
| Rôle | Email |
|---|---|
| Direction | `admin@demo-ecole.klasso.tn` |
| Enseignant | `prof@demo-ecole.klasso.tn` (+ `prof.math`, `prof.fr`, `prof.sci`) |
| Parent | `parent@demo-ecole.klasso.tn` (+ ~44 parents `parent.<nom>.<prenom>@demo-ecole.klasso.tn`) |
| Personnel | `staff@demo-ecole.klasso.tn` |

Données : 44 élèves / 3 classes (CP-A, CE1-B, CE2-A), familles, matières, journal, activités, discipline, santé, cantine, transport, sécurité, contrats RH, congés, paie.

## Comptes — Maternelle (`demo-maternelle`, KINDERGARTEN)
| Rôle | Email |
|---|---|
| Direction | `admin@demo-maternelle.klasso.tn` |
| Animateur (enseignant) | `anim@demo-maternelle.klasso.tn` |
| Parent | `parent@demo-maternelle.klasso.tn` (+ 14 parents `parent.<nom>.<prenom>@demo-maternelle.klasso.tn`) |
| Personnel | `staff@demo-maternelle.klasso.tn` |

Données : 14 enfants / 2 classes (Petite Section, Grande Section), familles, journal, activités, cantine, etc.

## Plateforme (SaaS)
| Rôle | Email |
|---|---|
| Super-admin | `super@klasso.tn` |

## Connexion
Web : `/login` (ou `/t/<slug>/login` pour un tenant brandé). Mobile : écran de connexion (code école → email/mot de passe). Endpoint démo rapide : `POST /api/auth/demo-login {"persona":"..."}`.
