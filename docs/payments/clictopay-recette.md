# ClicToPay — Mise en recette (étapes opérateur)

> Le **code** d'intégration (PR-5/PR-6) est livré et testé via `MockGateway`. Le branchement réel
> ClicToPay dépend d'éléments fournis par la banque (Monétique Tunisie) — étapes ci-dessous.

## 1. Pré-requis banque (hors code)
- Obtenir les **credentials de test** marchand : `userName` / `password`.
- Faire **activer le compte marchand** sur l'environnement de test.
- (Pour l'auto-renouvellement futur) demander l'activation des **bindings** (tokenisation).
- Récupérer les **cartes de test** ClicToPay + le cahier de recette.
- Contacts : voir `docs/payments/clictopay-integration.md` §10.

## 2. Configuration (variables d'env API)
```
CLICTOPAY_BASE_URL="https://test.clictopay.com/rest"
CLICTOPAY_USER="<merchant test user>"
CLICTOPAY_PWD="<merchant test password>"
```
> Dès que `CLICTOPAY_USER` est défini, l'API sélectionne automatiquement `ClicToPayGateway`
> (sinon `MockGateway`). Aucun redéploiement de code nécessaire — juste les variables.

## 3. URL de callback (portail marchand)
Configurer la notification serveur-à-serveur vers :
```
https://<API_HOST>/api/payments/callback
```
- L'API répond **200** immédiatement puis **re-vérifie** via `getOrderStatus.do` (le callback n'est pas une preuve).
- Idempotent sur `orderNumber`. Whitelister l'IP source ClicToPay si possible (pare-feu).

## 4. Pages de paiement hébergées (design/ops)
ClicToPay héberge des pages HTML brandées par marchand (ZIP XHTML par locale, cf.
`docs/payments/clictopay-integration.md` §8). À préparer + uploader via le portail marchand.
**Tâche design/ops distincte**, non bloquante pour le flux API.

## 5. Recette (cahier de tests banque)
1. Paiement **OK** → `getOrderStatus` = 2 → transaction `PAID` + abonnement `ACTIVE`.
2. Paiement **KO** (refus) → transaction `FAILED`.
3. **Annulation** (`reverse.do`) le jour même.
4. **Remboursement** (`refund.do`) après compensation.
5. Vérifier la réconciliation `orderId ↔ orderNumber ↔ statut`.

## 6. Bascule production
- Remplacer `CLICTOPAY_BASE_URL` par l'URL prod fournie par la banque + credentials prod.
- Tester avec une carte réelle ; vérifier annulation/remboursement ; informer la banque du go-live.
