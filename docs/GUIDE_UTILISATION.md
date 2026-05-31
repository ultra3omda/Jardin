# Guide d'utilisation Klasso

> Plateforme SaaS de gestion d'écoles et de jardins d'enfants (Tunisie). Ce guide couvre :
> la connexion aux démos, les rôles, et la gestion des établissements côté Klasso (super-admin).

---

## 1. Architecture en une image

Klasso est **un seul produit SaaS multi-tenant** :

- **Chaque établissement = un « tenant » isolé** (ses données ne sont jamais mélangées avec une autre école).
  - `demo-ecole` → une **école primaire** de démonstration.
  - `demo-maternelle` → un **jardin d'enfants** de démonstration.
- **Application web** (back-office) : direction, enseignants, personnel.
- **Application mobile** (Expo, iOS/Android) : **un seul binaire** dont l'interface s'adapte au **rôle** de la personne connectée.
  - Un **parent**, un **enseignant** et la **direction** utilisent la **même app**, mais voient des écrans différents.
  - « 3 applications » = **3 expériences dans une seule app**, pas 3 téléchargements séparés.

> Donc : l'école primaire et le jardin d'enfants sont **2 tenants** du même Klasso. Chacun a sa
> direction, ses enseignants et ses parents, sur le **même** site web et la **même** app mobile —
> les données et le branding (logo, couleurs) étant propres à chaque établissement.

---

## 2. Comptes de démonstration

Mot de passe **commun** à tous les comptes démo : défini par `DEMO_PASSWORD` au moment du seed
(voir `docs/DEMO_CREDENTIALS.md`). Exemple recommandé : `KlassoDemo2026!`.

### École primaire — `demo-ecole` (tenant : École Démo Pilote)
| Rôle | Email | Ce qu'il voit |
|---|---|---|
| **Direction** | `admin@demo-ecole.klasso.tn` | Tout l'établissement : élèves, classes (CP-A, CE1-B, CE2-A), enseignants, notes, présences, finances, RH, annonces. |
| **Enseignant** | `prof@demo-ecole.klasso.tn` | Ses classes, saisie de notes, présences, journal, messages. |
| **Parent** | `parent@demo-ecole.klasso.tn` | Uniquement **ses enfants** : bulletins, présences, cantine, transport, santé, messages. |
| **Personnel** | `staff@demo-ecole.klasso.tn` | Cantine, transport, sécurité, infirmerie selon habilitation. |

### Jardin d'enfants — `demo-maternelle` (tenant : Jardin Démo)
| Rôle | Email | Ce qu'il voit |
|---|---|---|
| **Direction** | `admin@demo-maternelle.klasso.tn` | L'établissement : sections (Petite/Grande Section), animateurs, enfants, journal, activités. |
| **Animateur (enseignant)** | `anim@demo-maternelle.klasso.tn` | Ses sections, cahier de liaison, activités. |
| **Parent** | `parent@demo-maternelle.klasso.tn` | Son enfant : cahier de liaison, activités, cantine, santé. |
| **Personnel** | `staff@demo-maternelle.klasso.tn` | Cantine, sécurité. |

### Plateforme Klasso (gestion des établissements)
| Rôle | Email | Ce qu'il fait |
|---|---|---|
| **Super-admin Klasso** | `super@klasso.tn` | Crée et administre les établissements clients, voit les statistiques plateforme (MRR, abonnements), l'audit, les demandes de démo. |

> Sur mobile, un écran « code école » permet de choisir l'établissement (`demo-ecole` ou
> `demo-maternelle`) avant de saisir email + mot de passe.

---

## 3. Gérer les établissements (rôle Klasso / super-admin)

Le **super-admin** (`super@klasso.tn`) gère le portefeuille de clients depuis `/admin` :

### Créer une nouvelle école / maternelle
1. `/admin/tenants` → **Créer un établissement**.
2. Renseigner : **nom**, **slug** (URL, ex. `ecole-carthage`), **type** (école / maternelle / mixte), **langue**, et le **branding** (couleur primaire, logo).
3. Saisir l'**email du directeur** : un compte direction est créé + un **lien d'invitation** envoyé par email (l'admin choisit son mot de passe à la première connexion).
4. (Optionnel) **Ajouter les premiers comptes** (enseignants / parents / personnel) via l'endpoint personas → invitations automatiques.

Résultat : un **nouvel établissement isolé**, brandé à ses couleurs, accessible sur le même web
(`/t/<slug>/login`) et la même app mobile (code école = `<slug>`).

### Suivre l'activité plateforme
- `/admin` : KPIs (établissements, utilisateurs, élèves, **MRR/ARR** réels issus des abonnements).
- `/admin/analytics` : croissance, répartition par type/langue, revenu.
- `/admin/audit` : journal d'audit. `/admin/demo` : demandes de démo entrantes.

---

## 4. Parcours type par rôle

### Direction (SCHOOL_ADMIN)
Tableau de bord → **Élèves** (CRUD, import CSV) · **Classes** (élèves + enseignant) ·
**Pédagogie** (évaluations, notes, bulletins) · **Présences** · **RH/Paie** (contrats, congés,
bulletins de paie) · **Finance** (factures, abonnement Klasso) · **Communication** (annonces,
messages) · **Opérations** (cantine, transport, santé, sécurité) · **Réglages** (branding, matières).

### Enseignant
Ses classes → saisir **notes** et **présences**, tenir le **journal**, publier des **annonces**,
échanger en **messagerie**.

### Parent
Ses enfants → consulter **bulletins**, **présences**, **cantine/transport/santé**, recevoir les
**annonces** et **notifications** (in-app, email, push, SMS), échanger avec l'école.

---

## 5. Réinitialiser / repeupler les démos

```bash
# Depuis la racine du monorepo
DEMO_PASSWORD="KlassoDemo2026!" pnpm --filter @ecole-saas/api prisma db seed
```
Le seed est **idempotent** : ré-exécutable sans créer de doublons, et remet tous les comptes démo
sur le `DEMO_PASSWORD` courant. Données peuplées : élèves (noms tunisiens), classes + enseignants,
emploi du temps, évaluations + notes, présences, annonces, factures, RH, cantine/transport/santé/
sécurité, journal & activités.
