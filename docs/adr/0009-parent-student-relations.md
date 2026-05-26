# 0009 — Parent ↔ Student relations (V3-A)

**Date:** 2026-05-26
**Status:** Accepted
**Deciders:** Klasso founding team (user-locked decisions)

## Context

V3 introduces the Parents module — schools need to attach parents to their children, send 1:1 messages, and let parents log in to see their kids' info. The original V3 spec lumped this into 2 days but the user picked Socket.IO for the messaging layer which doubles scope. We split V3 into two slices:

- **V3-A (this ADR)**: relational data layer + admin UI to link parents to students. No messaging yet.
- **V3-B (next session)**: Socket.IO gateway + Conversation/Message Prisma models + chat UI on web + mobile.

This ADR locks the V3-A design decisions.

## Decisions

### D27 — Parent entity = User with `role = PARENT`

Instead of a separate `Parent` table, we reuse the existing `User` model with the `PARENT` enum value (already in the schema since V1).

**Rationale:** zero duplication of auth/JWT/tenant-context plumbing. A parent who will log in to the future parents mobile app is already a `User` — adding a second entity would force us to either bridge two tables for login (complex) or maintain duplicate emails (data integrity risk).

**Trade-off:** parents who never log in (just an SMS contact for the school) still take a row in the `users` table. Acceptable cost — they get a real account anyway when the V3-B messaging ships.

### D28 — Join table `ParentStudent` (N-N)

Pivot table with:
- `id` (cuid2)
- `tenantId` (multi-tenant scope)
- `parentUserId` → `users.id`
- `studentId` → `students.id`
- `relationType` enum `RelationType { FATHER | MOTHER | LEGAL_GUARDIAN | OTHER }`
- `isPrimaryContact` bool (the contact for school comms; one per student via UI convention, not DB-enforced to allow transitions)
- `createdAt`

DB-enforced unique constraint on `(parentUserId, studentId)`. Cascading deletes on tenant / parent / student deletion. Added to `TENANT_SCOPED_MODELS` so Prisma extension auto-injects `tenantId` filter on every read.

### D29 — Communication 1:1 deferred to V3-B (Socket.IO d'entrée)

User picked Socket.IO over REST polling. V3-A ships **without** messaging — V3-B adds:
- Prisma models `Conversation` (parentUserId + teacher/admin) + `Message`
- NestJS `@WebSocketGateway` with Socket.IO adapter
- Web + mobile chat UI
- Typing indicators + read receipts

### D30 — Admin UI surface

V3-A ships a `<ParentsSection>` card on `/students/[id]`:
- Lists current parent links (parent name + email + relationType + primary-contact badge)
- SCHOOL_ADMIN sees a create form (parentUserId + relationType + isPrimaryContact) and per-row delete button
- TEACHER / STAFF / PARENT(self) see read-only

The current form requires the SCHOOL_ADMIN to know the parent's `userId` (cuid2). A friendlier email-based picker is V3-B follow-up — out of scope here to ship V3-A in one session.

## RBAC

| Role          | POST | GET | PATCH | DELETE |
| ------------- | ---- | --- | ----- | ------ |
| SUPER_ADMIN   | ✅   | ✅  | ✅    | ✅     |
| SCHOOL_ADMIN  | ✅   | ✅  | ✅    | ✅     |
| TEACHER       | ❌   | ✅  | ❌    | ❌     |
| STAFF         | ❌   | ✅  | ❌    | ❌     |
| PARENT        | ❌   | own only | ❌ | ❌     |

PARENT role gets forced server-side to `parentUserId = currentUser.id` on list — they can't enumerate other parents' relations.

## Files

```
apps/api/prisma/migrations/20260526170000_v3_a_parent_relations/migration.sql
apps/api/prisma/schema.prisma                          (+ RelationType enum + ParentStudent model)
apps/api/src/common/prisma/tenant.extension.ts         (TENANT_SCOPED_MODELS += 'ParentStudent')
apps/api/src/parent-relations/dto/parent-relation.dto.ts
apps/api/src/parent-relations/parent-relations.service.ts
apps/api/src/parent-relations/parent-relations.controller.ts
apps/api/src/parent-relations/parent-relations.module.ts
apps/api/src/parent-relations/parent-relations.service.spec.ts
apps/api/src/app.module.ts                             (register ParentRelationsModule)
apps/web/app/api/parent-relations/[...action]/route.ts (passthrough proxy)
apps/web/lib/api/parent-relations.ts                   (TanStack-friendly client)
apps/web/app/[locale]/(app)/students/[id]/parents-section.tsx
apps/web/app/[locale]/(app)/students/[id]/page.tsx     (mount ParentsSection)
```

## Out of scope for V3-A

- Email-based parent picker (V3-B)
- Conversations / Messages (V3-B)
- Socket.IO gateway (V3-B)
- Parent-facing mobile app screens (V12)
- Bulk import of parent links via CSV (V3-C if needed)

## References

- Backend pattern mirror : `apps/api/src/students/`
- Web pattern mirror : `apps/web/app/[locale]/(app)/students/[id]/student-detail.tsx`
