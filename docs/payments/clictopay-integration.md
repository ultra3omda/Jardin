# ClicToPay — Documentation d'intégration (référence projet)

> Passerelle de paiement électronique (Monétique Tunisie) — API REST, cartes Visa/MasterCard, 3-D Secure, PCI-DSS. Source : manuel d'intégration ClicToPay (fourni par le client, 2026-05-31). Vérifier auprès du support pour évolutions (3DS2, nouveaux endpoints).

## 1. Environnements
- Test : `https://test.clictopay.com` (REST base : `https://test.clictopay.com/rest`)
- Prod : URL fournie par la banque après recette.

## 2. Auth
- `userName` + `password` marchand envoyés **en paramètres de chaque requête** (pas de token).
- Stocker en env : `CLICTOPAY_USER`, `CLICTOPAY_PWD`, `CLICTOPAY_BASE_URL`. Jamais en dur. HTTPS only.

## 3. Endpoints REST
| Endpoint | Usage |
|---|---|
| `/register.do` | Enregistrer une commande (autorisation) → renvoie `{ orderId, formUrl }` |
| `/reverse.do` | Annuler (avant compensation, jour même) |
| `/refund.do` | Rembourser (après compensation, montant partiel possible) |
| `/getOrderStatus.do` | Statut simple (source de vérité) |
| `/getOrderStatusExtended.do` | Statut étendu (3DS, secureAuth, binding ; accepte orderId OU orderNumber) |

## 4. register.do — paramètres clés
`userName`, `password`, `orderNumber` (AN..32 **unique** côté marchand), `amount` (**plus petite unité** : millimes pour TND → `10,500 TND = 10500`), `currency` (**788** = TND, 978 EUR, 840 USD), `returnUrl` (oblig.), `failUrl`, `description`, `language` (`fr|en|ar`), `pageView` (`DESKTOP|MOBILE`), `clientId` (pour bindings), `jsonParams` (ex. `{"email":"..."}`), `sessionTimeoutSecs` (déf. 1200), `expirationDate`, `bindingId` (paiement par token, CVC seul).
- Réponse : `{ "orderId": "...", "formUrl": "https://.../payment_fr.html?mdOrder=..." }` → rediriger le client vers `formUrl`.
- Erreurs `register`: 0 OK · 1 orderNumber dupliqué/invalide · 3 devise inconnue · 4 param manquant · 5 valeur erronée · 7 erreur système.

## 5. getOrderStatus.do — OrderStatus
0 enregistrée non payée · 1 pré-autorisation bloquée (2 phases) · **2 = PAYÉ** · 3 annulée (reverse) · 4 remboursée · 5 autorisation via ACS · 6 refusée.
> `authCode` obsolète (toujours 2) — se fier à `OrderStatus`.

## 6. Callbacks (serveur-à-serveur, GET)
Params : `mdOrder` (= orderId ClicToPay), `orderNumber`, `operation` (`approved|deposited|reversed|refunded`), `status` (`1` succès / `0` échec).
- Le marchand **doit répondre HTTP 200** pour acquitter ; sinon 6 retries (10,20,…,60 min).
- **Le callback n'est PAS une preuve** : toujours revalider via `getOrderStatus.do`. Idempotence : un même `(mdOrder, operation)` peut arriver plusieurs fois. Whitelister l'IP source ClicToPay.

## 7. Sécurité / implémentation (notes)
- **Pas de signature HMAC** sur le callback → la sécurité repose sur : (a) re-vérification `getOrderStatus.do` côté serveur, (b) IP allowlist ClicToPay, (c) `orderNumber` non devinable.
- Ne **jamais** faire confiance au seul `returnUrl` (navigateur).
- `orderNumber` unique = mécanisme d'idempotence (retry même orderNumber → errorCode 1).
- 3DS géré entièrement par ClicToPay (rien à coder hors hébergement des pages).
- **Bindings** (tokenisation pour récurrence) : activation banque requise + `clientId` au 1er paiement ; `bindingId` revient dans `getOrderStatus`. → utile pour l'auto-renouvellement d'abonnement (phase 2).
- Conserver `orderId ↔ orderNumber ↔ statuts` pour réconciliation comptable.

## 8. Pages de paiement hébergées (ops/design, hors code)
ClicToPay héberge des pages HTML par marchand (ZIP via portail). Fichiers `payment_<locale>.html`, `errors_<locale>.html`, `mobile_*`. DTD XHTML 1.0 Transitional, UTF-8, URLs relatives, scripts jQuery requis, DOM `#formPayment`/`#acs` obligatoires. Upload : portail `test.clictopay.com/mportal`. → **tâche d'intégration design/branding séparée, à planifier avec la banque** (pas du ressort du backend).

## 9. Procédure (cycle)
Credentials test → pages perso → config marchand banque → upload pages test → **recette** (OK/KO/annulation/remboursement) → formation portail → bascule prod (carte réelle + go-live banque).

## 10. Support Monétique Tunisie
- Wissem BAGHDADI — 71 155 836 — wissem.baghdadi@monetiquetunisie.com
- Ahmed AMRI — 71 155 851 — ahmed.amri@monetiquetunisie.com
- Mohamed Amine BENNIA — 71 155 853 — mohamedamine.bennia@monetiquetunisie.com
