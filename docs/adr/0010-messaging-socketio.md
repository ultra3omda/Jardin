# 0010 — V3-B Messaging : Socket.IO + Conversation 1:1

**Date:** 2026-05-26
**Status:** Accepted
**Deciders:** User (D33, this session)

## Context

V3 (D27) introduced the Parent role and ParentStudent N-N relation (V3-A,
ADR 0009 + PR #34). V3-B closes the communication channel between school
members (SCHOOL_ADMIN, TEACHER, STAFF, PARENT) by adding 1:1 messaging.

The user explicitly picked **Socket.IO d'entrée** over a REST-only MVP
(my recommendation), accepting the 2× scope increase (~3j vs ~1.5j).

## Decision

### Topology

- **Server (NestJS, Railway)** : `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io`. Single-process, no Redis adapter — Railway runs one replica which is fine for V3-B traffic (sub-100 concurrent users / tenant). When we hit horizontal scale (V11 hardening), swap in `@socket.io/redis-adapter` + Upstash.
- **Client web (Vercel)** : `socket.io-client` connecting DIRECTLY to `NEXT_PUBLIC_API_URL` (Railway) on the `/messaging` namespace. WebSocket through Vercel's Next.js route handlers is not viable (closed-loop, no native streaming), so the browser bypasses the proxy. Tradeoff : CORS pinning needed in production (covered by existing CORS_ORIGIN env).
- **Client mobile (Expo)** : deferred to V12. The mobile app will reuse the same `/messaging` namespace + JWT pattern.

### Protocol

Namespace `/messaging`. Authenticated via JWT on the handshake :
- `client.handshake.auth.token = <access-jwt>` (preferred, library default)
- Fallback `Authorization: Bearer <jwt>` header

Each connected user is auto-joined to a personal room `user:<userId>`. Outbound :
- `message:new` `{ conversationId, message }` → recipients
- `message:read` `{ conversationId, readerId, readAt }` → recipients

Inbound (server `@SubscribeMessage`) :
- `message:send` `{ conversationId, body }` → ack `MessageResponseDto`
- `conversation:read` `{ conversationId }` → ack `{ ok: true }`

### Data model

3 tables :
- `conversations(id cuid2, tenantId, createdAt, updatedAt)` — strictly 2 participants for V3-B, multi-party groups reported V9
- `conversation_participants(conversationId, userId, joinedAt, lastReadAt nullable)` — composite PK, `lastReadAt` drives unread badge
- `messages(id cuid2, tenantId, conversationId, senderId, body text, createdAt, readAt nullable)` — `tenantId` denormalized for isolation queries without join

### Authorization

REST + Socket.IO share `MessagingService.assertParticipant()` :
- SUPER_ADMIN explicitly excluded (`TENANT_REQUIRED` error) — messaging is intra-tenant
- All other roles authorized to create conversations + send messages within their tenant
- 404 if conversation in another tenant or if user isn't a participant
- Messages emitted only to the personal rooms of OTHER participants (sender doesn't re-receive their own message via socket — they get the ack)

### HTTP fallback

Every WS event has a REST mirror :
- `POST /api/messaging/conversations` ↔ `message:send` requires existing conversation
- `POST /api/messaging/messages` ↔ `message:send`
- `POST /api/messaging/conversations/:id/read` ↔ `conversation:read`
- `GET /api/messaging/conversations` — paginated list (no WS equivalent — initial sync)
- `GET /api/messaging/conversations/:id/messages?before=&limit=` — cursor pagination

The web client uses Socket.IO when connected, falls back to HTTP otherwise (see `sendMessageHttp` in `lib/api/messaging.ts`).

## Consequences

**Positive :**
- Real-time UX matches modern messaging expectations.
- HTTP fallback ensures the feature works even when WS is blocked (corporate proxies, firewalls).
- Auth reuse (same JWT) — no new credential primitive.

**Negative :**
- Railway scaling : 1 replica only until we add Redis adapter. Acceptable for V3-B traffic ; flagged in V11 hardening.
- WebSocket bandwidth + connection count adds to Railway dyno cost. Negligible at V3-B traffic (under 100 connections/tenant).
- Browser→Railway direct WS connection requires CORS pinning in prod (already env-validated).
- Socket.IO library lock-in. Alternatives (raw `ws`, native `EventSource` SSE) rejected because the room semantics + ack pattern + reconnect logic are non-trivial to reimplement.

## Alternatives considered

- **REST + polling MVP** (originally recommended) — rejected by user, would ship faster but feels sluggish next to consumer chat UX.
- **Server-Sent Events (SSE)** — one-way only, can't carry the `message:send` ack pattern.
- **Vercel Queues + cron poll** — too eventual, no real-time feel.
- **Pusher / Ably / Supabase Realtime** — third-party dependency, monthly fee, adds another vendor.

## V3-B explicit out-of-scope (deferred V9 / V12)

- Multi-party group conversations
- File attachments / images
- Push notifications (Twilio SMS / Resend transactional / Expo Push)
- Typing indicators
- Mobile chat UI (V12 ships TestFlight + Play with the chat screen)
- Redis adapter for horizontal scale (V11)

## References

- Code :
  - `apps/api/src/messaging/` (Gateway + Service + Controller + DTOs + 7 unit tests)
  - `apps/api/prisma/migrations/20260526190000_v3_b_messaging/`
  - `apps/web/lib/messaging/socket.ts`, `apps/web/lib/api/messaging.ts`
  - `apps/web/app/[locale]/(app)/messages/` (list + thread)
  - `apps/web/app/api/messaging/[...action]/route.ts` (REST proxy)
- NestJS WebSockets docs : `https://docs.nestjs.com/websockets/gateways`
