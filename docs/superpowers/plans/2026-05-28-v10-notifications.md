# V10 — Notifications multi-canal

**Date** : 2026-05-28  
**Branche** : `feat/v10-notifications`  
**Objectif** : Déclencher des notifications sur les événements métier clés (message, note, absence, facture, annonce) et les livrer en 3 canaux : in-app (déjà en DB), email (Resend déjà configuré), et push mobile (Expo Push).

---

## État avant V10

| Canal | État |
|-------|------|
| In-app web (DB + API + bell) | ✅ opérationnel (V8) |
| Email Resend + react-email | ✅ ResendService + templates auth existants |
| Fanout sur événements | ❌ NotificationsService.create() jamais appelé |
| Expo push tokens | ❌ non implémenté |
| Préférences utilisateur | ❌ non implémenté |
| SMS Twilio | 🔜 hors scope V10 (V11+) |

---

## Axe A — Event fanout NestJS (3 tâches)

### A1 · NotificationFanoutService

**Fichier** : `apps/api/src/notifications/notification-fanout.service.ts`

Service injectable qui encapsule la logique de fan-out multi-canal :
1. Appelle `NotificationsService.create()` → in-app DB
2. Appelle `ResendService.send()` si l'utilisateur a email activé
3. Appelle `ExpoPushService.send()` si l'utilisateur a un push token valide

Méthodes :
- `fanoutMessage(tenantId, recipientUserId, senderName, conversationId)` — TYPE: MESSAGE
- `fanoutGrade(tenantId, parentUserId, studentName, subjectName, periodName)` — TYPE: GRADE
- `fanoutAbsence(tenantId, parentUserId, studentName, date, justified)` — TYPE: ATTENDANCE
- `fanoutInvoice(tenantId, parentUserId, studentName, amount)` — TYPE: INVOICE
- `fanoutAnnouncement(tenantId, userIds[], title)` — TYPE: ANNOUNCEMENT

### A2 · Wiring dans les modules existants

Injecter `NotificationFanoutService` et appeler les méthodes fan-out dans :

- `messaging/conversations.service.ts` : après sendMessage() → fanoutMessage()
- `evaluations/evaluations.service.ts` : après create() → fanoutGrade()
- `absences/absences.service.ts` : après create() → fanoutAbsence()
- `billing/billing.service.ts` : après createInvoice() → fanoutInvoice()
- `announcements/announcements.service.ts` : après create() → fanoutAnnouncement()

### A3 · Tests unitaires fanout

`apps/api/src/notifications/notification-fanout.service.spec.ts` :
- Mock NotificationsService, ResendService, ExpoPushService
- Test fanoutMessage → appelle create + send correctement
- Test que les erreurs email/push ne propagent pas (non-blocking)

---

## Axe B — Email templates notification (2 tâches)

### B1 · Template react-email notification

**Fichier** : `apps/api/src/common/email/templates/notification-email.tsx`

Template générique avec : title, body, ctaLabel, ctaUrl, notificationType, palette Klasso terracotta.

### B2 · Intégration dans NotificationFanoutService

Dans chaque méthode fanout, construire le sujet email + render template :
- MESSAGE → "Nouveau message de {senderName}"
- GRADE → "Nouvelle note : {subjectName}"
- ATTENDANCE → "Absence signalée pour {studentName}"
- INVOICE → "Nouvelle facture"
- ANNOUNCEMENT → "Annonce : {title}"

---

## Axe C — Expo Push notifications (3 tâches)

### C1 · Prisma : champ pushToken + prefs sur User

Migration `20260528000000_v10_push_token` :
- `expoPushToken TEXT` (nullable) sur User
- `pushEnabled BOOLEAN DEFAULT true` sur User
- `emailNotificationsEnabled BOOLEAN DEFAULT true` sur User

### C2 · API : endpoint register push token

`POST /users/me/push-token` — body `{ token: string }`, guard JWT  
Proxy web : `apps/web/app/api/users/push-token/route.ts`

### C3 · ExpoPushService

**Backend** : `apps/api/src/common/push/expo-push.service.ts`
- `pnpm --filter=api add expo-server-sdk`
- `send(token, title, body, data?)` — non-bloquant, log erreurs, supprime tokens invalides

**Mobile** : `apps/mobile/lib/push-token.ts`
- `registerForPushNotifications()` → demande permission → POST `/api/users/push-token`
- Appelé dans `apps/mobile/app/(app)/_layout.tsx` après auth

---

## Axe D — Préférences + PATCH API (1 tâche)

### D1 · PATCH /users/me/notification-preferences

Body : `{ emailNotificationsEnabled?, pushEnabled? }`  
Web : petite section dans `/settings` (ou profile) pour activer/désactiver.

---

## Ordre d'exécution

```
Phase 1 : C1 (migration) → commit
Phase 2 : C3 backend (ExpoPushService) → commit
Phase 3 : B1 (email template notification) → commit
Phase 4 : A1 (NotificationFanoutService skeleton) → commit
Phase 5 : A2 (wiring modules) → commit
Phase 6 : C2 (push-token endpoint + proxy) → commit
Phase 7 : Mobile C3 (registerForPushNotifications) → commit
Phase 8 : D1 (preferences API + web toggle) → commit
Phase 9 : A3 (fanout unit tests) → commit
Phase 10 : E1 (lint + type-check + build + test) → verify
Phase 11 : PR + CI + merge
```

---

## Critères d'acceptation

- [ ] `pnpm lint && pnpm type-check && pnpm build` passe
- [ ] `pnpm --filter=api test` passe, coverage ≥ 70%
- [ ] POST /users/me/push-token 201 avec token valide
- [ ] Envoyer un message crée une notif in-app pour le destinataire
- [ ] Envoyer un message déclenche un email (log Resend)
- [ ] CI verte → merge automatique
