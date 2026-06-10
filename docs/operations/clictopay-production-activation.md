# Runbook — Activation ClicToPay en production

> Bascule du paiement ClicToPay (Monétique Tunisie) de l'environnement de test
> vers la production. Voir aussi [`docs/payments/clictopay-recette.md`](../payments/clictopay-recette.md)
> pour les tests. ⚠️ Touche à la facturation — procédure à dérouler avec soin.

## Rappel d'architecture

- Le checkout crée une `PaymentTransaction` (`orderNumber` = idempotence marchand)
  et redirige le client vers la page de paiement hébergée ClicToPay.
- Le montant facturé = **prix du plan × nombre d'élèves actifs** (facturation par élève).
- Le callback S2S (`GET /api/payments/callback`) et le retour navigateur
  (`GET /api/payments/return`) **ne font jamais confiance au payload** : le statut
  réel est re-vérifié côté serveur via `getOrderStatus`. Un callback forgé ne peut
  donc pas marquer une transaction `PAID`. (Pas de HMAC : non fourni par le REST ClicToPay.)

## Prérequis (auprès de Monétique Tunisie)

- [ ] Compte marchand **activé en production**.
- [ ] Identifiants production reçus (`userName`, `password`).
- [ ] Cartes de test fournies (et testées en recette).
- [ ] Contact support pour l'enregistrement de l'URL de callback.

## Pré-vol (en recette / staging)

- [ ] `CLICTOPAY_BASE_URL` = URL de test, `CLICTOPAY_USER/PWD` = identifiants test.
- [ ] Créer une facture de test → checkout : la page de paiement se charge.
- [ ] Payer avec une carte de test → le **callback** est bien reçu.
- [ ] Le statut de la transaction passe `PENDING` → `PAID`.
- [ ] L'abonnement passe automatiquement `ACTIVE` avec une période valide.
- [ ] Vérifier le calcul : montant = prix/élève × effectif.
- [ ] Tester le rejet de palier (effectif > `maxStudents`) et le cas 0 élève.

## Configuration (production)

- [ ] Demander à Monétique d'enregistrer l'URL de callback :
      `https://api.klasso.tn/api/payments/callback`
- [ ] Le cas échéant, whitelister l'IP de l'API chez la banque.
- [ ] Mettre à jour les variables d'environnement Railway :
  ```
  CLICTOPAY_BASE_URL=https://ipay.clictopay.com/rest   # URL prod fournie par la banque
  CLICTOPAY_USER=<utilisateur production>
  CLICTOPAY_PWD=<mot de passe production>
  ```
- [ ] Redéployer l'API (push sur `main` → auto-deploy Railway).

## Post-lancement (J1)

- [ ] Réaliser un **vrai** paiement de test (petit montant, ex. via une école pilote).
- [ ] Vérifier le règlement côté banque.
- [ ] Surveiller Sentry + logs API pour toute erreur de callback.
- [ ] Vérifier l'`AuditLog` / les `PaymentTransaction` en base.

## Rollback

En cas de problème : remettre `CLICTOPAY_BASE_URL` + identifiants sur l'environnement
de test (les transactions en cours restent `PENDING`, aucune n'est faussement `PAID`
grâce à la re-vérification serveur). Prévenir la banque.
