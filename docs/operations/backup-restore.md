# Runbook — Sauvegarde & restauration (Neon + R2)

> Stratégie de sauvegarde et procédure de restauration des données Klasso.
> ⚠️ À **tester** (fire drill) avant de facturer un client — une sauvegarde
> jamais restaurée n'est pas une sauvegarde.

## Périmètre

| Donnée | Stockage | Mécanisme de sauvegarde |
|---|---|---|
| Base relationnelle (élèves, notes, factures…) | Neon PostgreSQL | PITR + snapshots automatiques |
| Fichiers (photos élèves, logos, exports, bulletins PDF) | Cloudflare R2 | Versioning d'objets (à activer) |

---

## 1. PostgreSQL (Neon)

Neon fournit un **Point-In-Time Recovery (PITR)** sur une fenêtre de rétention
(7 jours en tier gratuit). Aucune configuration code nécessaire, mais la
restauration doit être documentée et **éprouvée**.

### Activation / vérification
- [ ] Console Neon → projet Klasso → **Settings → History retention** : confirmer
      la fenêtre (≥ 7 jours ; augmenter si le budget le permet).
- [ ] Confirmer que les snapshots automatiques sont actifs.

### Procédure de restauration (PITR)
1. Console Neon → projet → **Branches** → *Create branch from timestamp*.
2. Choisir l'instant cible (avant l'incident).
3. Une branche est créée avec les données restaurées (la prod n'est pas touchée).
4. Récupérer la `DATABASE_URL` de la branche, valider les données.
5. Bascule : soit promouvoir la branche, soit pointer l'API dessus (mettre à jour
   `DATABASE_URL` sur Railway), soit exporter/importer les lignes nécessaires.

### Fire drill (à faire 1×/trimestre)
- [ ] Restaurer un instant T-1h sur une branche jetable.
- [ ] Vérifier l'intégrité (comptes tenants, élèves, factures).
- [ ] Supprimer la branche. Noter la durée et tout écueil ici.

---

## 2. Fichiers (Cloudflare R2)

Les uploads sont immuables par clé, mais une **suppression ou un écrasement
de logo est définitif** sans versioning.

### Activation du versioning
- [ ] Dashboard Cloudflare → R2 → bucket `ecole-saas-exports` → activer le versioning.
- [ ] Idem pour `ecole-saas-tenant-assets`.
- [ ] (Optionnel) Lifecycle policy : conserver 30 jours d'historique des versions.

### Restauration d'un objet
1. R2 → bucket → objet → onglet versions → restaurer la version antérieure.
2. Pour un lot : utiliser `wrangler r2 object get/put` ou l'API S3-compatible.

---

## 3. Scénarios de reprise (DR)

| Scénario | Action |
|---|---|
| Corruption / suppression accidentelle de données DB | PITR Neon vers un instant antérieur (§1) |
| Logo / fichier écrasé par erreur | Restaurer la version R2 (§2) |
| Perte d'un tenant entier | PITR + ré-export ciblé des lignes du tenant |
| Compromission présumée | Rotation des secrets ([deployment-secrets.md](deployment-secrets.md)) + PITR avant l'incident |

## Cadence

- **Mensuel** : vérifier que les snapshots Neon tournent, contrôler le quota.
- **Trimestriel** : fire drill de restauration (DB + R2), consigner le résultat.
