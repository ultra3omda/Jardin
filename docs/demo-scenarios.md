# Scénarios de démo Klasso (web + mobile)

> Données semées par `apps/api/prisma/seed.ts` (idempotent). Chaque persona a un
> scénario cohérent : il ne voit que **ce que son rôle doit voir**, avec des
> données réelles (pas d'écran vide), aussi bien sur `klasso.tn` (web) que
> `klasso-mobile.vercel.app` (mobile).

## Connexion démo

- **1-clic** (recommandé) : `POST /api/auth/demo-login { "persona": "<persona>" }` — pas de mot de passe.
- **Manuel** : email ci-dessous + mot de passe démo partagé (variable `DEMO_PASSWORD`, affiché à la fin du seed).

## Établissements semés

| Tenant | Type | Classes | Élèves |
|---|---|---|---|
| **Démo École Pilote** (`demo-ecole`) | Primaire | CP-A, CE1-B, CE2-A | 44 |
| **Démo Maternelle** (`demo-maternelle`) | Maternelle | Petite Section, Grande Section | ~14 |

## Personas & ce qu'ils voient

### 🟠 Direction / Admin — `admin-primary` (`admin@demo-ecole`)
Vue **établissement complet** : 44 élèves · 3 classes · 4 enseignants · présences du jour · moyenne école · paiements en attente · annonces. Accès au **hub Gestion** (annuaire, classes, matières, cantine, activités, annonces, finances, transport, santé). Peut tout créer/éditer.

### 🔵 Enseignant — `teacher-primary` (`prof@demo-ecole`, Sami Hadj)
Professeur principal de **CP-A uniquement** (16 élèves). Tableau de bord **scopé à ses classes** : *Mes élèves* = 16, présence de CP-A, moyenne de CP-A, *Mes classes* = 1 — **pas de finance**. Depuis l'onglet **Classes** : Faire l'appel, **Devoirs** (2 devoirs sur CP-A + suivi des rendus), **Évaluations** (saisie des notes). Messagerie.

### 🟢 Parent — `parent-primary` (`parent@demo-ecole`, Salma Ben Ali)
2 enfants en CP-A (**Lina** & **Karim Ben Ali**). Accueil parent : enfants + moyennes, solde à régler, aperçu du cahier de liaison. Accès : **Mon enfant**, relevé de notes, **Emploi du temps**, **Paiements** (2 factures, dont 1 en attente), **Devoirs** des enfants (avec statut), **Journal**, **Messagerie**. Aucun accès gestion.

### 🟣 Personnel — `staff@demo-ecole`
Messagerie + notifications (périmètre support).

### Maternelle (mêmes rôles)
`admin-kindergarten`, `teacher-kindergarten` (animatrice Leila Marzouki), `parent-kindergarten` (2 enfants en Petite Section) — cahier de liaison riche (humeur, repas, sieste), activités d'éveil, cantine.

### 🔴 Super-admin — `super-admin` (`super@klasso.tn`)
Niveau **plateforme**, **sans tenant** : pas d'accès aux données d'un établissement (les endpoints tenant renvoient 403, c'est attendu). Sur mobile : Accueil, Notifs, Profil.

### Commercial — `commercial@klasso.tn`
Pipeline commercial (création de sous-admins / organisations), côté web.

## Réinitialiser les seeds (production)

Workflow GitHub Actions **« Seed production database »** (`.github/workflows/seed-prod.yml`, déclenchement manuel) :

- **Non destructif** (défaut, `reset = false`) : applique les migrations puis (re)sème de façon **idempotente** — ajoute/MAJ les données démo **sans rien supprimer**. À lancer après chaque évolution du seed.
- **Destructif** (`reset = true`) : `prisma migrate reset` (⚠️ **DROP de toutes les données**) puis reseed à neuf. À n'utiliser que pour repartir d'une base propre.

> En local : `docker compose up -d postgres` puis `pnpm --filter=@ecole-saas/api prisma migrate deploy && pnpm --filter=@ecole-saas/api prisma:seed`.

## Invariants de cohérence

- L'enseignant ne voit que **ses** classes/élèves/présences/notes (jamais la finance ni les autres classes).
- Le parent ne voit que **ses** enfants (notes, présences, EDT, factures, devoirs, journal).
- L'admin voit **tout son établissement** ; le super-admin **aucun** établissement.
- Les élèves de démo rattachés au parent ont toujours : notes, présences, emploi du temps, factures **et** devoirs — pour qu'aucune vue ne soit vide.
