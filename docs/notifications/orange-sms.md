# Orange Tunisie — SMS (BulkSmsAPI) — référence projet

> Fournisseur SMS retenu : **Orange Tunisie BulkSmsAPI** (envoi unitaire `sendSms`). Source : doc client (2026-05-31).

## Endpoint
- `POST {protocol}://{host}{/unite_send_url}` → défaut `https://inside.api.orange.tn/BulkSmsAPI/1.0/campaigns/basicApi/sendSms`
- `Content-Type: application/json`

## Authentification (double en-tête)
- `Authorization: Bearer {ORANGE_SMS_BEARER_TOKEN}` (gateway WSO2)
- `Authorization: Basic base64(email:password)` (compte Orange SMS)
- Les deux sont requis par l'implémentation de référence.

## Corps
```json
{ "language": "FR", "sms_content": "…", "contacts": ["+216XXXXXXXX"] }
```
- Le numéro est passé **sans indicatif** (ex. `20123456`) → préfixé `+216` automatiquement.

## Succès (côté app)
HTTP 200 **et** (`key === "SMS_SENT_SUCCESSFULLY"` si présent) **et** (`error === null` si présent). Sinon échec.

## Variables d'env
```
ORANGE_SMS_BEARER_TOKEN=...
ORANGE_SMS_EMAIL=...
ORANGE_SMS_PASSWORD=...
ORANGE_SMS_HOST=inside.api.orange.tn            # optionnel (défaut)
ORANGE_SMS_UNITE_SEND_URL=/BulkSmsAPI/1.0/campaigns/basicApi/sendSms  # optionnel (défaut)
```
Service **désactivé** (skip) si bearer/email/password absents → l'API démarre sans SMS configuré.

## Note d'implémentation
Node `fetch`/undici ne peut pas émettre deux en-têtes `Authorization` distincts ; ils sont concaténés
(`Bearer …, Basic …`). Si l'API Orange l'exige strictement séparés, basculer vers un client HTTP
bas niveau (`https.request`) — isolé dans `SmsService`, le reste de l'app est inchangé.
