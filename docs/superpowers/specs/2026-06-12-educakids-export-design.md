# Spec — Export & audit de `admin.educakids.tn` (migration vers Klasso)

> **Date** : 2026-06-12
> **Objectif** : extraire l'intégralité des données et auditer les fonctionnalités d'un
> ancien back-office scolaire (`admin.educakids.tn`) dont l'utilisateur est propriétaire/admin,
> en vue de migrer données + features vers Klasso (`ecole-saas`).
> **Autorisation** : système appartenant à l'utilisateur, compte admin légitime d'un seul
> établissement. Données contenant des mineurs (PII sensible) → traitement strictement local.

---

## 1. Contexte technique de la cible

- **URL** : `https://admin.educakids.tn/`
- **Rendu** : HTML server-rendered classique (vérifié par reconnaissance). Aucun framework SPA détecté.
- **Login** : formulaire HTML classique — champs `identifiant` + `Mot de passe`, bouton « Se connecter ».
- **i18n** : interface FR/AR.
- **Conséquence** : extraction par **HTTP pur avec session** (login POST → cookies réutilisés),
  pas besoin de navigateur headless.

## 2. Contrainte d'environnement (décision lockée)

- Scrapling dépend de `lxml` (DLL native compilée). **Windows Smart App Control bloque `etree.pyd`**
  (`ImportError: DLL load failed ... stratégie de contrôle d'application a bloqué ce fichier`).
- **Décision** : le scraper s'exécute dans **WSL Ubuntu 22.04** (déjà installé, Python 3.10.12),
  où il n'y a pas de SAC. Le code vit dans le repo Windows ; WSL y accède via
  `/mnt/c/Users/ultra/Desktop/Projets/ecole-saas`. La sortie atterrit dans le repo.
- Install unique : `wsl bash -lc "pip install scrapling"` (tire `lxml` en dépendance).

## 3. Stratégie scrapling

- **`FetcherSession`** (HTTP persistant, basé httpx) pour login + réutilisation des cookies sur tout le crawl.
- **`Selector`** scrapling pour le parsing HTML (sélecteurs CSS/XPath + auto-match).
- **Fallback** : si une page s'avère dépendre de JS (peu probable), bascule ponctuelle de cette
  page sur `StealthyFetcher`/`DynamicFetcher` (navigateur). Géré au cas par cas, évité par défaut.
- **Scraping responsable** : une seule session, rate-limiting (délai configurable entre requêtes,
  défaut 1 s), timeouts, pas de parallélisme agressif — ne pas faire tomber l'ancien serveur.

## 4. Architecture

```
tools/educakids-export/
├── README.md          # comment lancer (depuis WSL)
├── requirements.txt   # scrapling (+ deps)
├── config.py          # base URL, délais, sélecteurs, chemins sortie, constantes nommées
├── auth.py            # login (POST form) + session/cookies + détection session expirée + re-login
├── discover.py        # crawl de découverte : cartographie routes/modules/formulaires
├── extract.py         # extraction structurée par module → dicts Python (+ pagination)
├── binaries.py        # téléchargement photos/PDF/pièces jointes
├── audit.py           # audit fonctionnel : inventaire features, champs d'entités, actions CRUD
├── output.py          # écriture JSON + CSV + arborescence binaires
├── run.py             # orchestrateur / point d'entrée (CLI : --phase discover|extract)
├── .env               # IDENTIFIANT + MOT_DE_PASSE (gitignored — JAMAIS commité)
├── .env.example       # gabarit sans secrets
└── output/            # gitignored (PII)
    ├── data/<module>.json
    ├── csv/<module>.csv
    ├── files/<module>/<id>/...
    ├── audit/site-map.json
    ├── audit/audit-report.md
    ├── progress.json  # reprise sur incident
    ├── errors.json    # pages en échec (sans planter le run)
    └── run.log
```

Chaque fichier reste focalisé (< 300 lignes), fonctions < 50 lignes, naming anglais.

## 5. Déroulé en 2 phases

### Phase 1 — Découverte & audit (lecture seule)
1. Login → session.
2. Crawl de découverte : suivre les liens du menu/navigation, cartographier chaque module,
   route, formulaire, et les actions disponibles (créer/éditer/supprimer/exporter).
3. Produire `site-map.json` + `audit-report.md` (modules, fonctionnalités, champs de chaque entité).
4. **CHECKPOINT** : présenter la cartographie à l'utilisateur et obtenir sa validation
   **avant** toute extraction de masse.

### Phase 2 — Extraction (après validation de la carte)
5. Pour chaque module : parcourir les listes (pagination), ouvrir chaque fiche, extraire les
   champs structurés → JSON + CSV.
6. Télécharger les binaires (photos élèves, PDF, pièces jointes) dans `files/`.
7. Rapport final : compteurs par module, erreurs, éléments non extraits.

## 6. Gestion d'erreurs & reprise

- **Reprise** : écriture incrémentale + `progress.json` → relance sans tout refaire.
- **Session expirée** : détection d'une redirection vers `/login` → re-login automatique.
- **Logs** : `run.log` détaillé (URL, statut, durée) + résumé console.
- **Pages en échec** : collectées dans `errors.json` au lieu de planter le run.

## 7. Sécurité & confidentialité

- Identifiants **uniquement** dans `.env` (gitignored), jamais dans le code, jamais loggés.
- `output/` entièrement gitignored (données élèves = PII de mineurs).
- Données conservées **strictement en local**, jamais envoyées vers un service externe.
- `.env.example` fourni comme gabarit sans secret.

## 8. Tests

- **Unit** (pytest dans WSL) : parsing des fiches (HTML fixtures → dict attendu), détection
  de pagination, détection session expirée, écriture JSON/CSV.
- **Pas de test e2e réseau automatisé** (dépend d'identifiants live et d'un serveur tiers) —
  la phase 1 sert de validation manuelle réelle.
- Fixtures HTML anonymisées (pas de vraie PII commitée).

## 9. Hors scope (YAGNI)

- Pas de ré-import automatique dans Klasso (l'extraction produit du JSON prêt à importer ;
  l'import sera une vague séparée si besoin).
- Pas d'orchestration parallèle / multi-tenant (un seul établissement, un seul admin).
- Pas de navigateur headless par défaut (fallback ponctuel uniquement).

## 10. Livrables

1. Le scraper dans `tools/educakids-export/` (Python, exécuté dans WSL).
2. `site-map.json` + `audit-report.md` (audit fonctionnel — phase 1).
3. `data/*.json` + `csv/*.csv` + `files/**` (données extraites — phase 2).
4. `README.md` d'utilisation.
