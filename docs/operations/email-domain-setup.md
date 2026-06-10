# Runbook — Domaine email (support@klasso.tn)

> Faire passer les emails transactionnels (invitations, vérification, reset
> mot de passe, notifications) de `onboarding@resend.dev` vers un domaine
> `klasso.tn` vérifié, pour la délivrabilité et le professionnalisme.

## Pourquoi

- Aujourd'hui `EMAIL_FROM="onboarding@resend.dev"` → expéditeur générique,
  risque de spam, peu crédible.
- Un domaine vérifié (SPF + DKIM + DMARC) réduit fortement les rebonds et le
  classement en spam chez Gmail/Outlook.

## Procédure

### 1. Resend
- [ ] Console Resend → **Domains** → *Add domain* → `klasso.tn`.
- [ ] Resend affiche les enregistrements DNS à créer (SPF, DKIM, et un domaine
      d'envoi type `send.klasso.tn`).

### 2. DNS (OVH, registrar de klasso.tn)
- [ ] Ajouter l'enregistrement **SPF** (TXT) fourni, ex. `v=spf1 include:resend.com ~all`.
      ⚠️ Si un SPF existe déjà, **fusionner** les `include:` (un seul TXT SPF par domaine).
- [ ] Ajouter l'enregistrement **DKIM** (CNAME/TXT) fourni par Resend.
- [ ] Ajouter un **DMARC** (TXT sur `_dmarc.klasso.tn`), ex.
      `v=DMARC1; p=quarantine; rua=mailto:dmarc@klasso.tn`.

### 3. Vérifier
- [ ] Console Resend → *Verify domain* (propagation 5–30 min).
- [ ] Statut « Verified » sur les 3 enregistrements.

### 4. Basculer l'application
- [ ] Mettre à jour la variable sur Railway :
      ```
      EMAIL_FROM="Klasso <support@klasso.tn>"
      ```
- [ ] Redéployer l'API.

### 5. Tester
- [ ] Déclencher un email réel (invitation ou reset) vers une boîte Gmail + Outlook.
- [ ] Vérifier l'entête `From: support@klasso.tn`, l'absence de bannière « via resend.dev ».
- [ ] Surveiller le dashboard Resend (rebonds, plaintes).

## Réception des emails entrants (support@)

L'envoi via Resend ne crée pas de boîte de réception. Pour **relever**
`support@klasso.tn` : configurer Google Workspace, ou un email routing
(Cloudflare Email Routing / OVH redirection) vers une boîte existante.
- [ ] Décider de la solution de réception et la documenter ici. 👤
