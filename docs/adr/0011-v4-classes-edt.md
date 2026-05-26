# 0011 — V4 Classes + Affectations + EDT (recurring weekly slots)

**Date:** 2026-05-26
**Status:** Accepted (D31)
**Deciders:** User

## Context

V2 introduced Students with a free-text `classroom` field. V4 adds a real
`Class` entity, multi-teacher assignments per class (with subjects), and an
EDT (emploi du temps) primitive for weekly schedules.

## Decision

### Models (D31 lock — recurring weekly slots)

- **`Class`** — id, tenantId, name, level (e.g. "CP"), schoolYear ("2025-2026" ISO), soft-delete. Unique per `(tenantId, schoolYear, name)`.
- **`ClassTeacher`** — pivot User(TEACHER) ↔ Class with `subject` and `isMainTeacher`. Unique per `(classId, teacherUserId, subject)`.
- **`TimeSlot`** — Weekly recurring slot anchored to `dayOfWeek` (1=Lundi..7=Dimanche ISO-8601) + `periodStart` / `periodEnd` (HH:MM 24h strings). `teacherUserId` nullable (planned but unassigned slots allowed). `room` optional.

Rejected alternative: **Explicit dated slots** — 1 row per concrete session. Better for holidays/derogations but ×40 the volume, requires materializing the calendar. Reported V11+ if real need emerges.

### EDT UI — custom grid (no calendar lib)

7-day × 11-hour grid (08:00–18:00), CSS table, slot cells aligned by `periodStart` hour. Delete-on-hover.

Rejected: FullCalendar (250KB+), react-big-calendar (datetime events), shadcn-ui Calendar (month-picker).

### API surface

```
GET    /api/classes                            list (filter ?schoolYear=)
POST   /api/classes                            create (SCHOOL_ADMIN)
GET    /api/classes/:id                        detail incl. teachers + slots
PATCH  /api/classes/:id                        update name/level
DELETE /api/classes/:id                        soft-delete
POST   /api/classes/:id/teachers               assign teacher with subject
DELETE /api/classes/teachers/:assignmentId     unassign
POST   /api/classes/:id/timeslots              create slot
PATCH  /api/classes/timeslots/:slotId          edit slot
DELETE /api/classes/timeslots/:slotId          delete slot
```

All under JwtAuth + RolesGuard. List/detail open to TEACHER/STAFF/PARENT, mutations restricted to SCHOOL_ADMIN.

### Tenant isolation

Every query includes `tenantId: user.tenantId`. SUPER_ADMIN can't yet hit /classes (no tenant in JWT) — cross-tenant inspection deferred to V11.

## Consequences

**Positive :**
- Simple model, fits 95% of primary schools.
- Weekly grid UI is zero-dep, easy to style and accessibility-friendly.
- Migration path to V4-B drag/drop and Student.classId FK is straightforward.

**Negative :**
- Holiday weeks / derogation can't be modeled in V4-A — V11.
- Teacher hour-conflict detection not enforced — V4-B.
- No iCal export — V9.

## V4-A explicit out-of-scope (V4-B / V11)

- Drag/drop slots (V4-B)
- TEACHER persona dashboard "Mes classes" + "Mon EDT" (V4-B)
- Bulk EDT CSV import (V4-B)
- `Student.classId` FK migration from string `classroom` (V4-B)
- Holiday/derogation overrides (V11)
- Teacher hour-conflict detection (V4-B or V11)
- iCal/.ics export (V9)
- Unit tests (constraints isolés en faveur d'un livrable rapide; CI e2e couvre type-check + lint + build)

## References

- Migration: `apps/api/prisma/migrations/20260526210000_v4_classes_edt/`
- Backend: `apps/api/src/classes/` (controller + service + dto + module)
- Frontend: `apps/web/app/[locale]/(app)/classes/` (list + create + detail with grid)
- Proxy: `apps/web/app/api/classes/[...action]/route.ts`
- Client: `apps/web/lib/api/classes.ts`
