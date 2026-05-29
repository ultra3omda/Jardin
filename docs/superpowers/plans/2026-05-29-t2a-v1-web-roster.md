# T2a Vague 1 — Web Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the silent demo-data fallbacks on the SCHOOL_ADMIN web roster screens (Enseignants, Parents, Élèves, Classes, liens parent-élève) with real, persisted CRUD backed by the existing API, and seed realistic demo data so the demo rests on persisted rows — not hardcoded arrays.

**Architecture:** Introduce a small set of composable web primitives — a typed `fetch` wrapper (`lib/api/http.ts`), a token-gated read hook (`useResource`) with **no** demo fallback, a toast store + `<Toaster/>`, and CRUD UI primitives (`CrudModal`, `ResourceListPage`, `ErrorRetry`). Each roster page is rewritten/edited to consume these: reads via `useResource`, writes via typed per-domain API clients + TanStack `useMutation` (cache invalidation + toast). All tenant/role isolation stays derived from the JWT — never from Host/Origin. No Prisma schema change; the seed is extended (idempotently) to persist teachers, parents, and parent-student links.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · TanStack Query v5 · Zustand · react-hook-form ^7.53 + @hookform/resolvers ^3.9 + Zod ^3.23 · Tailwind/shadcn · Vitest (CI) · Playwright (CI) · NestJS/Prisma (seed only).

---

## Conventions & guardrails (read before starting)

- **JWT-only isolation.** Never key data access off Host/Origin/subdomain. The API already scopes every query by `tenantId` from the JWT.
- **No Prisma migration in this plan.** All models already exist. Editing `apps/api/prisma/seed.ts` is **not** a migration → no 🛑 checkpoint. Do **not** touch `schema.prisma`.
- **Local validation = type-check only.** Windows blocks native node addons (`ERR_DLOPEN_FAILED`), so `vitest` / `next build` / `next lint` crash locally. After each task run the local gate:
  - Web: `pnpm --filter=@ecole-saas/web type-check`
  - API (Task 10 only): `pnpm --filter=@ecole-saas/api type-check`
  Vitest specs and Playwright E2E **run in CI** — write them, but verify locally with type-check.
- **Auto-merge:** when CI is green the PR merges automatically (`gh pr merge <N> --merge`); no explicit OK needed.
- **Style:** UI copy in French, code in English. Files < 300 lines, functions < 50 lines. No `any`, no `@ts-ignore`. Conventional Commits, no attribution footer.
- **Anti-pattern being removed:** `catch → setState(DEMO_*)` and "empty list ⇒ show demo". Empty is a first-class state (EmptyState), errors are surfaced with a retry, never swallowed.

## File Structure

**Net-new files (verified absent via Glob):**
- `apps/web/lib/api/http.ts` — typed fetch wrapper: `ApiError`, `authHeaders`, `apiOk`, `apiGet/apiPost/apiPatch/apiDelete`.
- `apps/web/lib/api/http.test.ts` — Vitest unit tests (CI).
- `apps/web/lib/hooks/use-resource.ts` — token-gated read hook, no demo fallback.
- `apps/web/lib/ui/use-toast.ts` — zustand toast store + `useToast()` API.
- `apps/web/lib/ui/use-toast.test.ts` — Vitest unit tests (CI).
- `apps/web/components/ui/toaster.tsx` — renders the toast stack.
- `apps/web/components/ui/error-retry.tsx` — error block with a Réessayer button.
- `apps/web/components/crud/crud-modal.tsx` — accessible modal shell (Escape + backdrop close).
- `apps/web/components/crud/resource-list-page.tsx` — header + loading/error/empty/data state machine.
- `apps/web/lib/api/staff.ts` — teachers + parents API client.
- `apps/web/lib/validation/staff.schemas.ts` — Zod create/edit schemas.
- `apps/web/lib/validation/staff.schemas.test.ts` — Vitest unit tests (CI).
- `apps/web/components/crud/staff-form.tsx` — `StaffCreateForm` + `StaffEditForm` (RHF + zodResolver).
- `apps/web/e2e/roster.spec.ts` — Playwright E2E (CI).

**Modified files:**
- `apps/web/app/[locale]/(app)/app-shell-client.tsx` — mount `<Toaster/>`.
- `apps/web/app/[locale]/(app)/teachers/page.tsx` — full rewrite (remove `DEMO_TEACHERS` + local `apiFetch`).
- `apps/web/app/[locale]/(app)/parents/page.tsx` — full rewrite (remove `DEMO_PARENTS`).
- `apps/web/app/[locale]/(app)/students/students-list.tsx` — surgical edit (remove demo fallback).
- `apps/web/lib/api/classes.ts` — add `updateClass` + `deleteClass`.
- `apps/web/app/[locale]/(app)/classes/classes-list.tsx` — rewrite (remove `DEMO_SCHOOL_CLASSES`, add edit/delete).
- `apps/web/app/[locale]/(app)/students/[id]/_components/student-parents.tsx` — add Réessayer button.
- `apps/api/prisma/seed.ts` — fix student idempotency; seed teachers, parents, parent-student links.

**Untouched on purpose:** `apps/web/lib/demo/students.ts` and `apps/web/lib/demo/classes.ts` stay (detail views still use them); we only stop using them as list fallbacks.

---

### Task 1: HTTP client + `useResource` read hook

**Files:**
- Create: `apps/web/lib/api/http.ts`
- Test: `apps/web/lib/api/http.test.ts`
- Create: `apps/web/lib/hooks/use-resource.ts`

- [ ] **Step 1: Write the failing test** — `apps/web/lib/api/http.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiOk, authHeaders, apiGet } from './http';

function makeResponse(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authHeaders', () => {
  it('includes bearer token and json content type', () => {
    expect(authHeaders('abc')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });
});

describe('apiOk', () => {
  it('parses JSON body on 200', async () => {
    expect(await apiOk<{ id: string }>(makeResponse(200, { id: 'x' }))).toEqual({ id: 'x' });
  });

  it('returns undefined on 204', async () => {
    expect(await apiOk(makeResponse(204))).toBeUndefined();
  });

  it('throws ApiError with server message on 400', async () => {
    await expect(apiOk(makeResponse(400, { message: 'Bad input' }))).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Bad input',
    });
  });

  it('uses the first array message when message is an array', async () => {
    await expect(
      apiOk(makeResponse(422, { message: ['email must be valid', 'x'] })),
    ).rejects.toMatchObject({ status: 422, message: 'email must be valid' });
  });

  it('falls back to a status message when body is not JSON', async () => {
    await expect(apiOk(makeResponse(500))).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
    });
  });
});

describe('apiGet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls fetch with auth headers and returns the parsed body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(200, { ok: true }));
    expect(await apiGet<{ ok: boolean }>('/api/x', 'tok')).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
    });
  });
});
```

- [ ] **Step 2: Verify the test fails** — `pnpm --filter=@ecole-saas/web exec vitest run lib/api/http.test.ts`. Expected: FAIL — `Cannot find module './http'`. (Windows: skip running; the import will not type-check, which is the equivalent red.)

- [ ] **Step 3: Implement** — `apps/web/lib/api/http.ts`

```ts
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function apiOk<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    let message = `Request failed with status ${res.status}`;
    try {
      body = await res.json();
      if (body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message: unknown }).message;
        if (typeof m === 'string') message = m;
        else if (Array.isArray(m) && m.length > 0) message = String(m[0]);
      }
    } catch {
      // response had no JSON body — keep the status message
    }
    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  return apiOk<T>(await fetch(path, { headers: authHeaders(token) }));
}

export async function apiPost<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiOk<T>(
    await fetch(path, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }),
  );
}

export async function apiPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  return apiOk<T>(
    await fetch(path, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }),
  );
}

export async function apiDelete<T = void>(path: string, token: string): Promise<T> {
  return apiOk<T>(await fetch(path, { method: 'DELETE', headers: authHeaders(token) }));
}
```

- [ ] **Step 4: Implement** — `apps/web/lib/hooks/use-resource.ts`

```ts
'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export interface UseResourceResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Token-gated read hook. A resource is fetched only once the store is hydrated
 * and an access token exists. It never falls back to demo data — callers render
 * explicit loading / error / empty states from the returned flags.
 */
export function useResource<T>(
  key: QueryKey,
  fetcher: (token: string) => Promise<T>,
  options?: { enabled?: boolean },
): UseResourceResult<T> {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const enabled = (options?.enabled ?? true) && isHydrated && !!accessToken;

  const query = useQuery<T>({
    queryKey: key,
    queryFn: () => fetcher(accessToken as string),
    enabled,
  });

  return {
    data: query.data,
    isLoading: !isHydrated || (enabled && query.isPending),
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
```

- [ ] **Step 5: Verify tests pass (CI) / type-check (local)** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors. CI runs `vitest` → all `http.test.ts` cases PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/api/http.ts apps/web/lib/api/http.test.ts apps/web/lib/hooks/use-resource.ts
git commit -m "feat(web): add typed http client and token-gated useResource hook"
```

---

### Task 2: Toast store + `<Toaster/>`

**Files:**
- Create: `apps/web/lib/ui/use-toast.ts`
- Test: `apps/web/lib/ui/use-toast.test.ts`
- Create: `apps/web/components/ui/toaster.tsx`
- Modify: `apps/web/app/[locale]/(app)/app-shell-client.tsx` (mount `<Toaster/>`)

- [ ] **Step 1: Write the failing test** — `apps/web/lib/ui/use-toast.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore, AUTO_DISMISS_MS } from './use-toast';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('pushes a toast with message and variant', () => {
    useToastStore.getState().push('Saved', 'success');
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: 'Saved', variant: 'success' });
  });

  it('auto-dismisses after AUTO_DISMISS_MS', () => {
    useToastStore.getState().push('Saved', 'success');
    vi.advanceTimersByTime(AUTO_DISMISS_MS);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismisses a toast by id', () => {
    useToastStore.getState().push('A', 'info');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('assigns unique ids to consecutive toasts', () => {
    useToastStore.getState().push('A', 'info');
    useToastStore.getState().push('B', 'info');
    const ids = useToastStore.getState().toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
```

- [ ] **Step 2: Verify the test fails** — `pnpm --filter=@ecole-saas/web exec vitest run lib/ui/use-toast.test.ts`. Expected: FAIL — `Cannot find module './use-toast'`.

- [ ] **Step 3: Implement** — `apps/web/lib/ui/use-toast.ts`

```ts
'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export const AUTO_DISMISS_MS = 4000;

interface ToastStore {
  toasts: Toast[];
  push: (message: string, variant: ToastVariant) => void;
  dismiss: (id: string) => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}-${Date.now()}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, variant) => {
    const id = nextId();
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, AUTO_DISMISS_MS);
    }
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export function useToast(): ToastApi {
  const push = useToastStore((s) => s.push);
  return {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
    info: (message) => push(message, 'info'),
  };
}
```

- [ ] **Step 4: Implement** — `apps/web/components/ui/toaster.tsx`

```tsx
'use client';

import { useToastStore, type ToastVariant } from '@/lib/ui/use-toast';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-green-500/40 bg-green-50 text-green-900',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-navy-500/30 bg-slate-50 text-navy-900',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${VARIANT_CLASSES[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 opacity-70 transition hover:opacity-100"
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Mount the Toaster** — open `apps/web/app/[locale]/(app)/app-shell-client.tsx`. Add the import at the top with the other component imports:

```tsx
import { Toaster } from '@/components/ui/toaster';
```

Then render `<Toaster />` as the **last child inside** the `<QueryClientProvider>` (so toasts share the query context and overlay the whole shell). Example shape:

```tsx
return (
  <QueryClientProvider client={queryClient}>
    {/* ...existing shell markup (sidebar, header, {children}) unchanged... */}
    <Toaster />
  </QueryClientProvider>
);
```

- [ ] **Step 6: Verify (CI) / type-check (local)** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors. CI: `use-toast.test.ts` PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/ui/use-toast.ts apps/web/lib/ui/use-toast.test.ts apps/web/components/ui/toaster.tsx "apps/web/app/[locale]/(app)/app-shell-client.tsx"
git commit -m "feat(web): add toast store and mount Toaster in app shell"
```

---

### Task 3: CRUD UI primitives — `ErrorRetry`, `CrudModal`, `ResourceListPage`

**Files:**
- Create: `apps/web/components/ui/error-retry.tsx`
- Create: `apps/web/components/crud/crud-modal.tsx`
- Create: `apps/web/components/crud/resource-list-page.tsx`

> Reuses existing `apps/web/components/ui/{button,table-skeleton,empty-state}.tsx`. `EmptyState` props: `{ icon?, title, description?, action?, className? }` where `action` is `{ label, href }` or `{ label, onClick }`. `TableSkeleton` props: `{ rows?, cols?, className? }`. `Button` supports `variant`/`size`/`asChild`.

- [ ] **Step 1: Implement** — `apps/web/components/ui/error-retry.tsx`

```tsx
'use client';

import { Button } from '@/components/ui/button';

export interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorRetry({ message, onRetry }: ErrorRetryProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <p>{message ?? 'Une erreur est survenue lors du chargement.'}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Implement** — `apps/web/components/crud/crud-modal.tsx`

```tsx
'use client';

import { useEffect, type ReactNode } from 'react';

export interface CrudModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function CrudModal({ open, title, onClose, children }: CrudModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-navy-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement** — `apps/web/components/crud/resource-list-page.tsx`

```tsx
'use client';

import type { ReactNode } from 'react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';

type EmptyAction = { label: string; onClick: () => void } | { label: string; href: string };

export interface ResourceListPageProps {
  title: string;
  description?: string;
  action?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  errorMessage?: string;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: EmptyAction;
  skeletonCols?: number;
  children: ReactNode;
}

export function ResourceListPage({
  title,
  description,
  action,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyAction,
  skeletonCols = 4,
  children,
}: ResourceListPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={skeletonCols} />
      ) : isError ? (
        <ErrorRetry message={errorMessage} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        children
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors. If `EmptyState`/`TableSkeleton`/`Button` prop names differ, open the component file and align (do not change the primitives).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/ui/error-retry.tsx apps/web/components/crud/crud-modal.tsx apps/web/components/crud/resource-list-page.tsx
git commit -m "feat(web): add ErrorRetry, CrudModal and ResourceListPage primitives"
```

---

### Task 4: Staff API client + Zod schemas + staff forms

**API contract (already implemented — do not change the API):** `apps/api/src/users/staff.controller.ts` (`@Controller('users')`), proxied by `apps/web/app/api/teachers/[[...action]]/route.ts` → `/api/users/teachers*` and `apps/web/app/api/parents/[[...action]]/route.ts` → `/api/users/parents*`.
- `GET /api/teachers` → `{ items: StaffUser[], total }` (role TEACHER, `deletedAt: null`).
- `POST /api/teachers` body `{ email, firstName, lastName }` → `StaffUser & { tempPassword }`.
- `PATCH /api/teachers/:id` body `{ firstName?, lastName?, isActive? }` → `StaffUser` (`isActive:false` ⇒ deactivate; `true` ⇒ reactivate).
- `DELETE /api/teachers/:id` → 204.
- `GET /api/parents` → `{ items, total }`; `POST /api/parents` → `StaffUser & { tempPassword }`. **Parents = list + create only (no PATCH/DELETE).**
- `StaffUserResponseDto` has **no `isActive` field** — active status is derived from `deletedAt === null`.

**Files:**
- Create: `apps/web/lib/api/staff.ts`
- Create: `apps/web/lib/validation/staff.schemas.ts`
- Test: `apps/web/lib/validation/staff.schemas.test.ts`
- Create: `apps/web/components/crud/staff-form.tsx`

- [ ] **Step 1: Implement the API client** — `apps/web/lib/api/staff.ts`

```ts
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface StaffMutationResult extends StaffUser {
  tempPassword?: string;
}

export interface ListStaffResponse {
  items: StaffUser[];
  total: number;
}

export interface StaffCreateInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface StaffEditInput {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

const TEACHERS = '/api/teachers';
const PARENTS = '/api/parents';

export function listTeachers(token: string): Promise<ListStaffResponse> {
  return apiGet<ListStaffResponse>(TEACHERS, token);
}

export function createTeacher(token: string, input: StaffCreateInput): Promise<StaffMutationResult> {
  return apiPost<StaffMutationResult>(TEACHERS, token, input);
}

export function updateTeacher(token: string, id: string, input: StaffEditInput): Promise<StaffUser> {
  return apiPatch<StaffUser>(`${TEACHERS}/${id}`, token, input);
}

export function deleteTeacher(token: string, id: string): Promise<void> {
  return apiDelete(`${TEACHERS}/${id}`, token);
}

export function listParents(token: string): Promise<ListStaffResponse> {
  return apiGet<ListStaffResponse>(PARENTS, token);
}

export function createParent(token: string, input: StaffCreateInput): Promise<StaffMutationResult> {
  return apiPost<StaffMutationResult>(PARENTS, token, input);
}
```

- [ ] **Step 2: Write the failing schema test** — `apps/web/lib/validation/staff.schemas.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createStaffSchema, editStaffSchema } from './staff.schemas';

describe('createStaffSchema', () => {
  it('accepts a valid payload', () => {
    expect(
      createStaffSchema.safeParse({ firstName: 'Amine', lastName: 'Ben Salah', email: 'amine@example.com' })
        .success,
    ).toBe(true);
  });

  it('rejects an empty first name', () => {
    expect(createStaffSchema.safeParse({ firstName: '', lastName: 'X', email: 'a@b.co' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(createStaffSchema.safeParse({ firstName: 'A', lastName: 'B', email: 'nope' }).success).toBe(false);
  });

  it('rejects names longer than 100 chars', () => {
    expect(
      createStaffSchema.safeParse({ firstName: 'a'.repeat(101), lastName: 'B', email: 'a@b.co' }).success,
    ).toBe(false);
  });
});

describe('editStaffSchema', () => {
  it('accepts first and last name', () => {
    expect(editStaffSchema.safeParse({ firstName: 'A', lastName: 'B' }).success).toBe(true);
  });

  it('rejects a missing last name', () => {
    expect(editStaffSchema.safeParse({ firstName: 'A' }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Verify the test fails** — `pnpm --filter=@ecole-saas/web exec vitest run lib/validation/staff.schemas.test.ts`. Expected: FAIL — `Cannot find module './staff.schemas'`.

- [ ] **Step 4: Implement the schemas** — `apps/web/lib/validation/staff.schemas.ts`

```ts
import { z } from 'zod';

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(100, 'Le prénom est trop long'),
  lastName: z.string().trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  email: z.string().trim().email('Adresse e-mail invalide'),
});

export const editStaffSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis').max(100, 'Le prénom est trop long'),
  lastName: z.string().trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
});

export type CreateStaffValues = z.infer<typeof createStaffSchema>;
export type EditStaffValues = z.infer<typeof editStaffSchema>;
```

- [ ] **Step 5: Implement the forms** — `apps/web/components/crud/staff-form.tsx` (uses existing `components/ui/form.tsx`, which exports `Form, FormField, FormItem, FormLabel, FormControl, FormMessage`, and `components/ui/input.tsx`)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  createStaffSchema,
  editStaffSchema,
  type CreateStaffValues,
  type EditStaffValues,
} from '@/lib/validation/staff.schemas';

export interface StaffCreateFormProps {
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: CreateStaffValues) => void;
  onCancel: () => void;
}

export function StaffCreateForm({ submitLabel, pending, onSubmit, onCancel }: StaffCreateFormProps) {
  const form = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input placeholder="Amine" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Ben Salah" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="amine@ecole.tn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'En cours…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export interface StaffEditFormProps {
  defaultValues: EditStaffValues;
  pending: boolean;
  onSubmit: (values: EditStaffValues) => void;
  onCancel: () => void;
}

export function StaffEditForm({ defaultValues, pending, onSubmit, onCancel }: StaffEditFormProps) {
  const form = useForm<EditStaffValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'En cours…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] **Step 6: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors. CI: `staff.schemas.test.ts` PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/api/staff.ts apps/web/lib/validation/staff.schemas.ts apps/web/lib/validation/staff.schemas.test.ts apps/web/components/crud/staff-form.tsx
git commit -m "feat(web): add staff api client, validation schemas and staff forms"
```

---

### Task 5: Rewrite the Teachers page (the roster template)

This page is the **gabarit** the other roster pages follow. Rewrite it end-to-end: remove `DEMO_TEACHERS` and the local `apiFetch`; read via `useResource`; write via `staff.ts` mutations with cache invalidation + toast; preserve the temp-password reveal and the deactivate action.

**Files:**
- Modify (full rewrite): `apps/web/app/[locale]/(app)/teachers/page.tsx`

- [ ] **Step 1: Replace the entire file** with:

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { StaffCreateForm, StaffEditForm } from '@/components/crud/staff-form';
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  type StaffUser,
  type StaffMutationResult,
} from '@/lib/api/staff';
import type { CreateStaffValues, EditStaffValues } from '@/lib/validation/staff.schemas';

const TEACHERS_KEY = ['teachers', 'list'];

export default function TeachersPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(TEACHERS_KEY, listTeachers);
  const teachers = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
  const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

  const createMut = useMutation({
    mutationFn: (values: CreateStaffValues) => createTeacher(accessToken as string, values),
    onSuccess: (result: StaffMutationResult) => {
      invalidate();
      setCreateOpen(false);
      toast.success('Enseignant créé.');
      if (result.tempPassword) {
        setTempPassword({ name: `${result.firstName} ${result.lastName}`, password: result.tempPassword });
      }
    },
    onError: (err) => toast.error(errMsg(err, 'Création impossible.')),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; values: EditStaffValues }) =>
      updateTeacher(accessToken as string, vars.id, vars.values),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Enseignant mis à jour.');
    },
    onError: (err) => toast.error(errMsg(err, 'Mise à jour impossible.')),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => updateTeacher(accessToken as string, id, { isActive: false }),
    onSuccess: () => {
      invalidate();
      toast.success('Enseignant désactivé.');
    },
    onError: (err) => toast.error(errMsg(err, 'Désactivation impossible.')),
  });

  return (
    <>
      <ResourceListPage
        title="Enseignants"
        description="Gérez les enseignants de votre établissement."
        action={isAdmin ? <Button onClick={() => setCreateOpen(true)}>Ajouter un enseignant</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={teachers.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les enseignants."
        emptyTitle="Aucun enseignant"
        emptyDescription="Commencez par ajouter un enseignant à votre établissement."
        emptyAction={isAdmin ? { label: 'Ajouter un enseignant', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={isAdmin ? 5 : 4}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-navy-700">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => {
                const active = !t.deletedAt;
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-3 font-medium text-navy-900">
                      {t.firstName} {t.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                            Modifier
                          </Button>
                          {active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateMut.mutate(t.id)}
                              disabled={deactivateMut.isPending}
                            >
                              Désactiver
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Ajouter un enseignant" onClose={() => setCreateOpen(false)}>
        <StaffCreateForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!editing} title="Modifier l'enseignant" onClose={() => setEditing(null)}>
        {editing && (
          <StaffEditForm
            defaultValues={{ firstName: editing.firstName, lastName: editing.lastName }}
            pending={editMut.isPending}
            onSubmit={(values) => editMut.mutate({ id: editing.id, values })}
            onCancel={() => setEditing(null)}
          />
        )}
      </CrudModal>

      <CrudModal open={!!tempPassword} title="Mot de passe temporaire" onClose={() => setTempPassword(null)}>
        {tempPassword && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Communiquez ce mot de passe temporaire à <strong>{tempPassword.name}</strong>. Il ne sera plus
              affiché.
            </p>
            <code className="block rounded-md bg-slate-100 px-4 py-3 text-center text-lg font-bold text-navy-900">
              {tempPassword.password}
            </code>
            <div className="flex justify-end">
              <Button onClick={() => setTempPassword(null)}>J&apos;ai noté</Button>
            </div>
          </div>
        )}
      </CrudModal>
    </>
  );
}
```

- [ ] **Step 2: Confirm the demo data is gone** — grep the file: there must be **no** `DEMO_TEACHERS`, no local `apiFetch`, no `catch` that sets demo state.

Run: `pnpm --filter=@ecole-saas/web exec grep -n "DEMO_TEACHERS" "app/[locale]/(app)/teachers/page.tsx"` → Expected: no matches.

- [ ] **Step 3: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/(app)/teachers/page.tsx"
git commit -m "feat(web): rewrite teachers page on real CRUD (remove demo fallback)"
```

---

### Task 6: Rewrite the Parents page

Parents are **list + create only** (no edit/delete). Card-grid layout with a client-side search filter; remove `DEMO_PARENTS` and the local `apiFetch`.

**Files:**
- Modify (full rewrite): `apps/web/app/[locale]/(app)/parents/page.tsx`

- [ ] **Step 1: Replace the entire file** with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { StaffCreateForm } from '@/components/crud/staff-form';
import { listParents, createParent, type StaffMutationResult } from '@/lib/api/staff';
import type { CreateStaffValues } from '@/lib/validation/staff.schemas';

const PARENTS_KEY = ['parents', 'list'];

export default function ParentsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(PARENTS_KEY, listParents);
  const parents = data?.items ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => `${p.firstName} ${p.lastName} ${p.email}`.toLowerCase().includes(q));
  }, [parents, search]);

  const createMut = useMutation({
    mutationFn: (values: CreateStaffValues) => createParent(accessToken as string, values),
    onSuccess: (result: StaffMutationResult) => {
      queryClient.invalidateQueries({ queryKey: PARENTS_KEY });
      setCreateOpen(false);
      toast.success('Parent créé.');
      if (result.tempPassword) {
        setTempPassword({ name: `${result.firstName} ${result.lastName}`, password: result.tempPassword });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Création impossible.'),
  });

  return (
    <>
      <ResourceListPage
        title="Parents"
        description="Comptes parents de votre établissement."
        action={isAdmin ? <Button onClick={() => setCreateOpen(true)}>Ajouter un parent</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={parents.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les parents."
        emptyTitle="Aucun parent"
        emptyDescription="Créez un compte parent pour relier des élèves à leurs responsables."
        emptyAction={isAdmin ? { label: 'Ajouter un parent', onClick: () => setCreateOpen(true) } : undefined}
        skeletonCols={3}
      >
        <div className="space-y-4">
          <Input
            placeholder="Rechercher un parent…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun parent ne correspond à « {search} ».</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <p className="font-semibold text-navy-900">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.email}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Inscrit le {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResourceListPage>

      <CrudModal open={createOpen} title="Ajouter un parent" onClose={() => setCreateOpen(false)}>
        <StaffCreateForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(values) => createMut.mutate(values)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>

      <CrudModal open={!!tempPassword} title="Mot de passe temporaire" onClose={() => setTempPassword(null)}>
        {tempPassword && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Communiquez ce mot de passe temporaire à <strong>{tempPassword.name}</strong>. Il ne sera plus
              affiché.
            </p>
            <code className="block rounded-md bg-slate-100 px-4 py-3 text-center text-lg font-bold text-navy-900">
              {tempPassword.password}
            </code>
            <div className="flex justify-end">
              <Button onClick={() => setTempPassword(null)}>J&apos;ai noté</Button>
            </div>
          </div>
        )}
      </CrudModal>
    </>
  );
}
```

- [ ] **Step 2: Confirm demo data gone** — `pnpm --filter=@ecole-saas/web exec grep -n "DEMO_PARENTS" "app/[locale]/(app)/parents/page.tsx"` → Expected: no matches.

- [ ] **Step 3: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/(app)/parents/page.tsx"
git commit -m "feat(web): rewrite parents page on real CRUD (remove demo fallback)"
```

---

### Task 7: Remove the demo fallback from the Students list

`students-list.tsx` already uses the MODERN pattern (`useQuery` + `lib/api/students.ts`) with pagination + debounced search. The only change: stop falling back to `DEMO_STUDENTS_RESPONSE`, and render proper loading/error states. **Surgical edit — do not rewrite the whole file.** Keep pagination and the debounced search exactly as they are.

**Files:**
- Modify: `apps/web/app/[locale]/(app)/students/students-list.tsx`

- [ ] **Step 1: Read the current file** to anchor the edits — `Read apps/web/app/[locale]/(app)/students/students-list.tsx`. Note the exact lines for: the `DEMO_STUDENTS` import, the local `DEMO_STUDENTS_RESPONSE` constant (~lines 18-23), the `effectiveData` computation (~lines 75-78), and the loading marker `<p>Chargement…</p>`.

- [ ] **Step 2: Remove the demo import** — delete the import line that brings in the demo data, e.g.:

```tsx
import { DEMO_STUDENTS } from '@/lib/demo/students';
```

(Do **not** delete the `@/lib/demo/students` module — it is still used by the student detail views.)

- [ ] **Step 3: Remove the local demo response constant** — delete the `DEMO_STUDENTS_RESPONSE` block (~lines 18-23), e.g.:

```tsx
const DEMO_STUDENTS_RESPONSE: ListStudentsResponse = {
  items: DEMO_STUDENTS,
  total: DEMO_STUDENTS.length,
  page: 1,
  pageSize: PAGE_SIZE,
};
```

- [ ] **Step 4: Add the state imports** at the top with the other component imports:

```tsx
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
```

- [ ] **Step 5: Replace the `effectiveData` fallback with direct data.** Destructure `refetch` (and `isError`/`isLoading`) from the existing `useQuery` and replace the fallback line:

```tsx
// BEFORE (delete):
const effectiveData = (!debounced && (error || !data || data.total === 0))
  ? DEMO_STUDENTS_RESPONSE
  : (data ?? DEMO_STUDENTS_RESPONSE);

// AFTER (use real data only):
const students = data?.items ?? [];
const total = data?.total ?? 0;
```

Update every downstream reference (table rows, pagination total/`totalPages`) that read `effectiveData.items` / `effectiveData.total` to use `students` / `total`.

- [ ] **Step 6: Gate the table with loading/error/empty states.** Replace the `<p>Chargement…</p>` marker and wrap the table region:

```tsx
{isLoading ? (
  <TableSkeleton rows={8} cols={5} />
) : isError ? (
  <ErrorRetry message="Impossible de charger les élèves." onRetry={() => refetch()} />
) : students.length === 0 ? (
  <p className="py-8 text-center text-sm text-muted-foreground">
    {debounced ? `Aucun élève ne correspond à « ${debounced} ».` : 'Aucun élève enregistré.'}
  </p>
) : (
  /* existing <table> … render rows from `students`, keep pagination controls below */
)}
```

Make sure pagination controls remain visible only when `!isLoading && !isError && students.length > 0` (or keep them where they are and read `total`).

- [ ] **Step 7: Confirm demo fallback gone** — `pnpm --filter=@ecole-saas/web exec grep -n "DEMO_STUDENTS\|effectiveData" "app/[locale]/(app)/students/students-list.tsx"` → Expected: no matches.

- [ ] **Step 8: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add "apps/web/app/[locale]/(app)/students/students-list.tsx"
git commit -m "fix(web): drop demo fallback from students list, add loading/error states"
```

---

### Task 8: Classes — add `updateClass`/`deleteClass`, rewrite the list (remove demo fallback, add edit/delete)

**API contract (already implemented — do not change the API):** `apps/api/src/classes/classes.controller.ts` exposes `GET /` (list), `POST /` (create, SCHOOL_ADMIN), `GET /:id`, `PATCH /:id` (update, SCHOOL_ADMIN), `DELETE /:id` → 204 (SCHOOL_ADMIN). **`UpdateClassDto` accepts only `{ name?, level? }` — NOT `schoolYear`.** Proxied by `apps/web/app/api/classes/[[...action]]/route.ts`.

`apps/web/lib/api/classes.ts` has its **own** `ok`/`authHeaders`/`BASE='/api/classes'` helpers (it predates `http.ts`). Keep using them in this file for consistency — do **not** rewire it to `http.ts`.

**Files:**
- Modify: `apps/web/lib/api/classes.ts` (add `updateClass` + `deleteClass`)
- Modify: `apps/web/app/[locale]/(app)/classes/classes-list.tsx` (rewrite)

- [ ] **Step 1: Add `updateClass` + `deleteClass`** to `apps/web/lib/api/classes.ts`, appended after `deleteTimeSlot` (reusing the file's existing `ok`/`authHeaders`/`BASE`). `updateClass` sends **only** `name`/`level` (never `schoolYear`):

```ts
export async function updateClass(
  token: string,
  id: string,
  payload: { name?: string; level?: string },
): Promise<SchoolClass> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function deleteClass(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
}
```

- [ ] **Step 2: Verify the client type-checks** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors.

- [ ] **Step 3: Rewrite the list** — replace the entire contents of `apps/web/app/[locale]/(app)/classes/classes-list.tsx`. This removes the `DEMO_SCHOOL_CLASSES` import and the `(queryErr || !data?.items?.length) ? DEMO_SCHOOL_CLASSES : data.items` fallback, reads via `useResource`, and adds create/edit/delete through `CrudModal` + toast + cache invalidation. Create and edit move into modals (cleaner than the old inline toggle and reuses the new primitives); the `schoolYear` pattern `^\d{4}-\d{4}$` and `CURRENT_YEAR` default are preserved in the create modal.

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Link } from '@/i18n/routing';
import {
  createClass,
  deleteClass,
  listClasses,
  updateClass,
  type SchoolClass,
} from '@/lib/api/classes';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';

const CLASSES_KEY = ['classes', 'list'] as const;
const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const YEAR_PATTERN = /^\d{4}-\d{4}$/;
const INPUT = 'mt-1 h-10 w-full rounded-md border px-3 text-sm';

export function ClassesList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useResource(CLASSES_KEY, (token) => listClasses(token));

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', level: '', schoolYear: CURRENT_YEAR });
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [editForm, setEditForm] = useState({ name: '', level: '' });
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: CLASSES_KEY });

  const createMutation = useMutation({
    mutationFn: () => createClass(accessToken as string, createForm),
    onSuccess: () => {
      setShowCreate(false);
      setCreateForm({ name: '', level: '', schoolYear: CURRENT_YEAR });
      setFormError(null);
      invalidate();
      toast.success('Classe créée.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec de la création.'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateClass(accessToken as string, editing!.id, { name: editForm.name.trim(), level: editForm.level.trim() }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast.success('Classe mise à jour.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec de la mise à jour.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClass(accessToken as string, deleting!.id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
      toast.success('Classe supprimée.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Échec de la suppression.'),
  });

  const items = data?.items ?? [];

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.level.trim() || !YEAR_PATTERN.test(createForm.schoolYear)) {
      setFormError('Renseignez un nom, un niveau et une année au format AAAA-AAAA.');
      return;
    }
    createMutation.mutate();
  }

  function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.level.trim()) {
      setFormError('Le nom et le niveau sont requis.');
      return;
    }
    setFormError(null);
    updateMutation.mutate();
  }

  function openEdit(c: SchoolClass) {
    setEditForm({ name: c.name, level: c.level });
    setFormError(null);
    setEditing(c);
  }

  return (
    <>
      <ResourceListPage
        title="Classes"
        description="Gérez les classes de l'établissement."
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowCreate(true);
              }}
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              + Nouvelle classe
            </button>
          ) : undefined
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={items.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger les classes."
        emptyTitle="Aucune classe enregistrée"
        emptyDescription="Créez votre première classe pour commencer."
        emptyAction={
          isAdmin ? { label: '+ Nouvelle classe', onClick: () => setShowCreate(true) } : undefined
        }
      >
        <ul className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-muted/40"
            >
              <Link href={`/classes/${c.id}` as never} className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Niveau {c.level} · Année {c.schoolYear}
                </p>
              </Link>
              {isAdmin && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </ResourceListPage>

      <CrudModal open={showCreate} title="Nouvelle classe" onClose={() => setShowCreate(false)}>
        <form onSubmit={submitCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="cls-name">Nom *</label>
            <input id="cls-name" value={createForm.name} placeholder="CP-A" className={INPUT}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="cls-level">Niveau *</label>
            <input id="cls-level" value={createForm.level} placeholder="CP" className={INPUT}
              onChange={(e) => setCreateForm({ ...createForm, level: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="cls-year">Année scolaire *</label>
            <input id="cls-year" value={createForm.schoolYear} pattern="^\d{4}-\d{4}$" className={INPUT}
              onChange={(e) => setCreateForm({ ...createForm, schoolYear: e.target.value })} />
          </div>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50">Annuler</button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Création…' : 'Créer la classe'}
            </button>
          </div>
        </form>
      </CrudModal>

      <CrudModal open={editing !== null} title="Modifier la classe" onClose={() => setEditing(null)}>
        <form onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="edit-name">Nom *</label>
            <input id="edit-name" value={editForm.name} className={INPUT}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="edit-level">Niveau *</label>
            <input id="edit-level" value={editForm.level} className={INPUT}
              onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">L&apos;année scolaire n&apos;est pas modifiable.</p>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50">Annuler</button>
            <button type="submit" disabled={updateMutation.isPending}
              className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
              {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </CrudModal>

      <CrudModal open={deleting !== null} title="Supprimer la classe" onClose={() => setDeleting(null)}>
        <p className="text-sm text-muted-foreground">
          Voulez-vous vraiment supprimer <strong>{deleting?.name}</strong> ? Cette action est définitive.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleting(null)} className="h-10 rounded-md border px-4 text-sm hover:bg-muted/50">Annuler</button>
          <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}
            className="h-10 rounded-md bg-rose-600 px-6 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50">
            {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </CrudModal>
    </>
  );
}
```

- [ ] **Step 4: Confirm the demo fallback is gone** — `pnpm --filter=@ecole-saas/web exec grep -n "DEMO_SCHOOL_CLASSES" "app/[locale]/(app)/classes/classes-list.tsx"` → Expected: no matches. (The `@/lib/demo/classes` module stays — the class **detail** view still imports it.)

- [ ] **Step 5: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/api/classes.ts "apps/web/app/[locale]/(app)/classes/classes-list.tsx"
git commit -m "feat(web): real CRUD for classes list, drop demo fallback"
```

---

### Task 9: Add a Réessayer button to the student → parents panel

`apps/web/app/[locale]/(app)/students/[id]/_components/student-parents.tsx` is already clean (no demo fallback). Its only gap is that the load-error state is a dead-end message with no retry. Surface the existing `useQuery` `refetch` behind a button. **Surgical edit — do not rewrite the file.**

**Files:**
- Modify: `apps/web/app/[locale]/(app)/students/[id]/_components/student-parents.tsx`

- [ ] **Step 1: Destructure `refetch`** from the query. Find (≈ line 100):

```tsx
const { data, isLoading, error } = useQuery({
```

Replace with:

```tsx
const { data, isLoading, error, refetch } = useQuery({
```

- [ ] **Step 2: Replace the dead-end error block** (≈ lines 146-150) with a message + Réessayer button. Find:

```tsx
{error && (
  <p className="mt-4 text-sm text-rose-600" role="alert">
    Erreur de chargement des parents.
  </p>
)}
```

Replace with:

```tsx
{error && (
  <div className="mt-4 flex flex-col items-start gap-2" role="alert">
    <p className="text-sm text-rose-600">Erreur de chargement des parents.</p>
    <button
      type="button"
      onClick={() => void refetch()}
      className="h-9 rounded-md border border-rose-600/40 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
    >
      Réessayer
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify** — `pnpm --filter=@ecole-saas/web type-check`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/(app)/students/[id]/_components/student-parents.tsx"
git commit -m "feat(web): add retry to student parents load-error state"
```

---

### Task 10: Seed real teachers, parents and parent-student links (idempotent)

After this task the demo rests on persisted rows: the Teachers page lists seeded TEACHER users, the Parents page lists seeded PARENT users, and student detail shows real parent links. **No Prisma schema change — `apps/api/prisma/seed.ts` only (editing the seed is not a migration → no 🛑).**

Three problems to fix in `apps/api/prisma/seed.ts`:
1. `seedStudents` mints a fresh `createId()` each run and upserts on that id → **re-running duplicates students.** Switch to a `findFirst` guard on `{ tenantId, firstName, lastName, classroom }`.
2. The only TEACHER for `demo-ecole` is `prof@…` → the Teachers page looks empty-ish. Add a few teachers.
3. No PARENT users / no `ParentStudent` rows exist → Parents page is empty and student detail shows no links. Derive a PARENT per student `parentEmail` and link it (idempotently).

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Import `RelationType`.** Find:

```ts
import {
  Locale,
  PrismaClient,
  Sex,
  TenantType,
  UserRole,
} from '@prisma/client';
```

Replace with:

```ts
import {
  Locale,
  PrismaClient,
  RelationType,
  Sex,
  TenantType,
  UserRole,
} from '@prisma/client';
```

- [ ] **Step 2: Make `seedStudents` idempotent and carry `parentEmail`.** Replace the whole block (the `SeededStudent` interface + `seedStudents` function, ≈ lines 104-133):

```ts
interface SeededStudent { id: string; firstName: string; lastName: string; classroom: string }

async function seedStudents(tenantId: string, classroom: string, names: Array<[string, string]>): Promise<SeededStudent[]> {
  const seeded: SeededStudent[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName] = names[i];
    const email = `parent.${lastName.toLowerCase()}.${firstName.toLowerCase()}@demo-ecole.klasso.tn`;
    const id = createId();
    await prisma.student.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        firstName,
        lastName,
        dateOfBirth: new Date(2018 - Math.floor(i / 10), (i % 12), 1 + (i % 27)),
        sex: i % 2 === 0 ? Sex.F : Sex.M,
        nationality: 'TN',
        classroom,
        parentEmail: email,
        siblingsCount: i % 3,
        country: 'TN',
        motherTongue: 'ar',
      },
    });
    seeded.push({ id, firstName, lastName, classroom });
  }
  return seeded;
}
```

with:

```ts
interface SeededStudent {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
  parentEmail: string;
}

async function seedStudents(
  tenantId: string,
  classroom: string,
  names: Array<[string, string]>,
): Promise<SeededStudent[]> {
  const seeded: SeededStudent[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName] = names[i];
    const parentEmail = `parent.${lastName.toLowerCase()}.${firstName.toLowerCase()}@demo-ecole.klasso.tn`;
    const existing = await prisma.student.findFirst({
      where: { tenantId, firstName, lastName, classroom },
    });
    if (existing) {
      seeded.push({ id: existing.id, firstName, lastName, classroom, parentEmail });
      continue;
    }
    const id = createId();
    await prisma.student.create({
      data: {
        id,
        tenantId,
        firstName,
        lastName,
        dateOfBirth: new Date(2018 - Math.floor(i / 10), i % 12, 1 + (i % 27)),
        sex: i % 2 === 0 ? Sex.F : Sex.M,
        nationality: 'TN',
        classroom,
        parentEmail,
        siblingsCount: i % 3,
        country: 'TN',
        motherTongue: 'ar',
      },
    });
    seeded.push({ id, firstName, lastName, classroom, parentEmail });
  }
  return seeded;
}

async function seedParentLinks(
  tenantId: string,
  students: SeededStudent[],
  passwordHash: string,
): Promise<number> {
  let links = 0;
  for (const s of students) {
    const parent = await upsertUser({
      tenantId,
      email: s.parentEmail,
      firstName: 'Parent',
      lastName: s.lastName,
      role: UserRole.PARENT,
      passwordHash,
    });
    const existingLink = await prisma.parentStudent.findFirst({
      where: { parentUserId: parent.id, studentId: s.id },
    });
    if (existingLink) continue;
    await prisma.parentStudent.create({
      data: {
        id: createId(),
        tenantId,
        parentUserId: parent.id,
        studentId: s.id,
        relationType: RelationType.MOTHER,
        isPrimaryContact: true,
      },
    });
    links += 1;
  }
  return links;
}
```

- [ ] **Step 3: Add extra TEACHER users for `demo-ecole`.** Find the existing ecole persona block:

```ts
  await upsertUser({ tenantId: ecole.id, email: 'admin@demo-ecole.klasso.tn',  firstName: 'Amadou',  lastName: 'Koné',     role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof@demo-ecole.klasso.tn',   firstName: 'Sami',    lastName: 'Hadj',     role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'parent@demo-ecole.klasso.tn', firstName: 'Salma',   lastName: 'Ben Ali',  role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'staff@demo-ecole.klasso.tn',  firstName: 'Omar',    lastName: 'Mansour',  role: UserRole.STAFF,        passwordHash });
```

Replace with (adds 3 teachers — the original four lines are unchanged):

```ts
  await upsertUser({ tenantId: ecole.id, email: 'admin@demo-ecole.klasso.tn',  firstName: 'Amadou',  lastName: 'Koné',     role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof@demo-ecole.klasso.tn',   firstName: 'Sami',    lastName: 'Hadj',     role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof.math@demo-ecole.klasso.tn', firstName: 'Nabil', lastName: 'Gharbi',  role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof.fr@demo-ecole.klasso.tn',   firstName: 'Rim',   lastName: 'Cherif',  role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof.sci@demo-ecole.klasso.tn',  firstName: 'Hédi',  lastName: 'Brahmi',  role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'parent@demo-ecole.klasso.tn', firstName: 'Salma',   lastName: 'Ben Ali',  role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'staff@demo-ecole.klasso.tn',  firstName: 'Omar',    lastName: 'Mansour',  role: UserRole.STAFF,        passwordHash });
```

- [ ] **Step 4: Capture students and create parent links.** Find:

```ts
  // -- Students -- realistic, ~50 split across 3 classes ---------------------
  await seedStudents(ecole.id, 'CP-A', [
    ['Lina', 'Ben Ali'], ['Karim', 'Ben Ali'], ['Yacine', 'Mansour'], ['Maya', 'Trabelsi'],
    ['Adam', 'Hadj'], ['Sara', 'Belhaj'], ['Anis', 'Riahi'], ['Nour', 'Khaldi'],
    ['Inès', 'Bouaziz'], ['Rayan', 'Mejri'], ['Aya', 'Hammami'], ['Wassim', 'Lassoued'],
    ['Yasmine', 'Saidi'], ['Mehdi', 'Chaabane'], ['Sirine', 'Karoui'], ['Hamza', 'Jbeli'],
  ]);
  await seedStudents(ecole.id, 'CE1-B', [
    ['Ibrahim', 'Ba'], ['Aïcha', 'Sow'], ['Mohamed', 'Diop'], ['Aminata', 'Cissé'],
    ['Ousmane', 'Diallo'], ['Fatou', 'Niang'], ['Bakary', 'Touré'], ['Awa', 'Ndiaye'],
    ['Cheikh', 'Fall'], ['Mariama', 'Sy'], ['Souleymane', 'Sarr'], ['Khadidja', 'Gueye'],
    ['Modibo', 'Konaté'], ['Bintou', 'Camara'], ['Lamine', 'Diakité'], ['Salimata', 'Doumbia'],
  ]);
  await seedStudents(ecole.id, 'CE2-A', [
    ['Tarek', 'Trabelsi'], ['Lilia', 'Bouaziz'], ['Skander', 'Ben Hassine'], ['Mariem', 'Mejri'],
    ['Aziz', 'Lassoued'], ['Nadia', 'Hammami'], ['Bilel', 'Karoui'], ['Donia', 'Jbeli'],
    ['Hatem', 'Saidi'], ['Ines', 'Khaldi'], ['Walid', 'Riahi'], ['Habiba', 'Chaabane'],
  ]);
```

Replace with (same three calls, now captured + linked):

```ts
  // -- Students -- realistic, ~50 split across 3 classes ---------------------
  const cpA = await seedStudents(ecole.id, 'CP-A', [
    ['Lina', 'Ben Ali'], ['Karim', 'Ben Ali'], ['Yacine', 'Mansour'], ['Maya', 'Trabelsi'],
    ['Adam', 'Hadj'], ['Sara', 'Belhaj'], ['Anis', 'Riahi'], ['Nour', 'Khaldi'],
    ['Inès', 'Bouaziz'], ['Rayan', 'Mejri'], ['Aya', 'Hammami'], ['Wassim', 'Lassoued'],
    ['Yasmine', 'Saidi'], ['Mehdi', 'Chaabane'], ['Sirine', 'Karoui'], ['Hamza', 'Jbeli'],
  ]);
  const ce1B = await seedStudents(ecole.id, 'CE1-B', [
    ['Ibrahim', 'Ba'], ['Aïcha', 'Sow'], ['Mohamed', 'Diop'], ['Aminata', 'Cissé'],
    ['Ousmane', 'Diallo'], ['Fatou', 'Niang'], ['Bakary', 'Touré'], ['Awa', 'Ndiaye'],
    ['Cheikh', 'Fall'], ['Mariama', 'Sy'], ['Souleymane', 'Sarr'], ['Khadidja', 'Gueye'],
    ['Modibo', 'Konaté'], ['Bintou', 'Camara'], ['Lamine', 'Diakité'], ['Salimata', 'Doumbia'],
  ]);
  const ce2A = await seedStudents(ecole.id, 'CE2-A', [
    ['Tarek', 'Trabelsi'], ['Lilia', 'Bouaziz'], ['Skander', 'Ben Hassine'], ['Mariem', 'Mejri'],
    ['Aziz', 'Lassoued'], ['Nadia', 'Hammami'], ['Bilel', 'Karoui'], ['Donia', 'Jbeli'],
    ['Hatem', 'Saidi'], ['Ines', 'Khaldi'], ['Walid', 'Riahi'], ['Habiba', 'Chaabane'],
  ]);

  // -- Parents -- one PARENT user per student, linked idempotently -----------
  const parentLinks = await seedParentLinks(ecole.id, [...cpA, ...ce1B, ...ce2A], passwordHash);
```

- [ ] **Step 5: Surface the new counts in the summary log.** Find:

```ts
  console.log('');
  console.log('Demo data seeded successfully (V7).');
```

Replace with:

```ts
  console.log('');
  console.log(`Demo data seeded successfully (T2a): ${parentLinks} new parent link(s).`);
```

- [ ] **Step 6: Verify** — `pnpm --filter=@ecole-saas/api type-check`. Expected: no errors. (The seed itself runs in CI/preview deploy, not locally — Windows blocks the native Prisma engine; do **not** run `prisma db seed` locally.)

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed teachers, parents and parent-student links idempotently"
```

---

### Task 11: E2E roster spec + final verification + PR

Prove the roster persists by driving the real UI: create a teacher (persists across reload), and create → edit → delete a class. Follows the existing `apps/web/e2e/settings.spec.ts` pattern (1-click demo-login as **Direction** = SCHOOL_ADMIN, `@smoke` tag). Playwright runs **in CI** (Windows blocks it locally); locally we only type-check.

**Files:**
- Create: `apps/web/e2e/roster.spec.ts`

- [ ] **Step 1: Write the E2E spec** — `apps/web/e2e/roster.spec.ts`

```ts
import { expect, test } from '@playwright/test';

/**
 * Roster CRUD E2E (@smoke) — proves the SCHOOL_ADMIN roster screens persist
 * real data (no demo fallback). Auth: 1-click demo-login as "Direction".
 *
 * Prerequisites (local / CI):
 *   docker compose up -d
 *   pnpm --filter=@ecole-saas/api prisma migrate deploy && prisma db seed
 *   pnpm --filter=@ecole-saas/api dev   # API on :4000
 *   (web auto-starts via playwright.config.ts webServer)
 */

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Direction/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Roster — Teachers @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create a teacher → appears in the table and survives a reload', async ({ page }) => {
    await page.goto('/teachers');
    await expect(page.getByRole('heading', { name: /Enseignants/i })).toBeVisible();

    await page.getByRole('button', { name: /Ajouter un enseignant/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const stamp = Date.now().toString(36);
    const email = `prof.e2e.${stamp}@demo-ecole.klasso.tn`;
    await page.getByLabel('Prénom').fill('Test');
    await page.getByLabel('Nom').fill(`Prof ${stamp}`);
    await page.getByLabel('E-mail').fill(email);
    await page.getByRole('button', { name: /^Créer$/ }).click();

    // Success surfaces the temporary password modal
    await expect(page.getByRole('heading', { name: /Mot de passe temporaire/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /J'ai noté/i }).click();

    // The new teacher is in the table…
    await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });

    // …and is still there after a full reload (persisted, not demo state).
    await page.reload();
    await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Roster — Classes @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create → edit → delete a class', async ({ page }) => {
    await page.goto('/classes');
    await expect(page.getByRole('heading', { name: /^Classes$/ })).toBeVisible();

    const stamp = Date.now().toString(36);
    const name = `E2E-${stamp}`;
    const renamed = `${name}-edit`;

    // Create (schoolYear keeps its CURRENT_YEAR default)
    await page.getByRole('button', { name: /Nouvelle classe/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#cls-name').fill(name);
    await page.locator('#cls-level').fill('CM1');
    await page.getByRole('button', { name: /Créer la classe/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('li', { hasText: name })).toBeVisible({ timeout: 10_000 });

    // Edit (rename)
    await page.locator('li', { hasText: name }).getByRole('button', { name: /Modifier/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#edit-name').fill(renamed);
    await page.getByRole('button', { name: /Enregistrer/i }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('li', { hasText: renamed })).toBeVisible({ timeout: 10_000 });

    // Delete (confirm)
    await page.locator('li', { hasText: renamed }).getByRole('button', { name: /Supprimer/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /^Supprimer$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('li', { hasText: renamed })).toHaveCount(0, { timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Confirm no roster list still falls back to demo data** — run the sweep:

```bash
pnpm --filter=@ecole-saas/web exec grep -rn "DEMO_TEACHERS\|DEMO_PARENTS\|DEMO_STUDENTS_RESPONSE\|DEMO_SCHOOL_CLASSES\|effectiveData" "app/[locale]/(app)/teachers" "app/[locale]/(app)/parents" "app/[locale]/(app)/students/students-list.tsx" "app/[locale]/(app)/classes/classes-list.tsx"
```

Expected: **no matches.** (Detail views under `students/[id]` and `classes/[id]` may still import `@/lib/demo/*` — that is intentional and out of scope here.)

- [ ] **Step 3: Final local verification** — both type-checks must be clean:

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/api type-check
```

Expected: no errors in either. (Do **not** run `vitest`, `next build`, `next lint`, or `prisma db seed` locally — native-binding block; CI runs them.)

- [ ] **Step 4: Commit, push, open the PR, monitor CI, auto-merge on green**

```bash
git add apps/web/e2e/roster.spec.ts
git commit -m "test(web): add roster CRUD e2e (teacher persist, class create/edit/delete)"

# Implementation runs on its own branch (created by using-git-worktrees at execution time).
git push -u origin feat/t2a-v1-web-roster

gh pr create --title "feat(web): T2a V1 — real CRUD roster (drop demo fallbacks)" --body "$(cat <<'EOF'
## Summary
- Add web primitives: typed `http` client, token-gated `useResource` (no demo fallback), toast store + `<Toaster/>`, `CrudModal` / `ResourceListPage` / `ErrorRetry`.
- Rewrite roster screens on real CRUD: Enseignants (list/create/edit/deactivate), Parents (list/create), Élèves (remove demo fallback), Classes (list/create/edit/delete).
- Add a Réessayer button to the student → parents load-error state.
- Seed real teachers, parents and parent-student links idempotently; fix student seed idempotency.

## Test plan
- [ ] CI: web lint + type-check + build green
- [ ] CI: Vitest (`http`, `use-toast`, `staff.schemas`) green
- [ ] CI: Playwright `roster.spec.ts @smoke` green (teacher persists across reload; class create→edit→delete)
- [ ] CI: API type-check green (seed compiles)
EOF
)"
```

Then poll `gh pr checks <N> --watch` (or the Vercel/Actions status). **When every check is green, merge immediately** — no explicit OK needed:

```bash
gh pr merge <N> --merge
```

If any check fails, read the logs, fix on the same branch, push, and re-poll. Do **not** merge red.

---

## Self-Review (writing-plans)

Reviewed the finished plan against the T2a spec (`docs/superpowers/specs/2026-05-29-school-admin-crud-remediation-design.md`) with fresh eyes.

**1. Spec coverage (Vague 1 — Web Roster slice).** Every roster requirement maps to a task:

| Spec requirement (Web Roster) | Task(s) |
|---|---|
| Shared typed HTTP client; no silent demo fallback | Task 1 (`http.ts`, `use-resource.ts`) |
| Mutation feedback (toast) + accessible modal + list scaffolding | Task 2 (`use-toast`, `Toaster`), Task 3 (`ErrorRetry`, `CrudModal`, `ResourceListPage`) |
| Staff API client + Zod schemas + create/edit forms | Task 4 (`lib/api/staff.ts`, `staff.schemas.ts`, `staff-form.tsx`) |
| Enseignants: list/create/edit/deactivate on real data | Task 5 (`teachers/page.tsx`) |
| Parents: list/create on real data | Task 6 (`parents/page.tsx`) |
| Élèves: drop demo fallback, real loading/error/empty | Task 7 (`students-list.tsx`) |
| Classes: list/create/edit/delete on real data | Task 8 (`classes.ts`, `classes-list.tsx`) |
| Parent ↔ élève link: surface load errors with retry | Task 9 (`student-parents.tsx`) |
| Realistic SEEDED demo data (not hardcoded arrays) | Task 10 (`seed.ts`: teachers, parents, parent-student links, idempotency fix) |
| Persistence proven; demo-fallback anti-pattern gone | Task 11 (`roster.spec.ts`, grep sweep, type-check, PR, auto-merge) |

Out-of-scope-by-design (other Vagues / specs, deliberately **not** in this plan): mobile roster screens (T2a V1 Mobile), pedagogy/finance/operational modules (T2a V2/V3, T2b), HR/payroll (T2c), SaaS admin (T2d). No Prisma migration (all models pre-exist) → no 🛑 checkpoint in this plan.

**2. Placeholder scan.** `grep` for `TBD|TODO|implement later|fill in|add appropriate|handle edge cases|Similar to Task|as above` → **0 matches**. Every code step ships complete code; every command step states the exact command and expected output.

**3. Type / name consistency across tasks.** Verified end-to-end:
- `useResource<T>(key, fetcher, options?)` → `{ data, isLoading, isError, error, refetch }` — defined in Task 1, destructured identically in Tasks 5/6/8 (`{ data, isLoading, isError, refetch }`).
- `ResourceListPageProps` (`title`, `action`, `isLoading`, `isError`, `errorMessage`, `onRetry`, `emptyTitle`, `emptyDescription?`, `emptyAction?`, `skeletonCols?`) — defined in Task 3, every prop passed consistently at all three call sites.
- `StaffUser` / `StaffMutationResult extends StaffUser { tempPassword? }` / `ListStaffResponse { items, total }` — defined in Task 4, consumed unchanged in Tasks 5/6.
- `listTeachers`/`createTeacher`/`updateTeacher`/`deleteTeacher`/`listParents`/`createParent` (Task 4) and `listClasses`/`createClass`/`updateClass`/`deleteClass` (Task 8) — names match their call sites exactly.
- Query keys `TEACHERS_KEY=['teachers','list']`, `PARENTS_KEY=['parents','list']`, `CLASSES_KEY=['classes','list']` — declared once per page, reused for both `useResource` and `invalidateQueries`.
- E2E selectors in Task 11 (button labels `Créer` / `Créer la classe` / `Enregistrer` / `Supprimer` / `J'ai noté`, input ids `#cls-name`/`#cls-level`/`#edit-name`, dialog role, temp-password heading) match the exact markup defined in Tasks 5 & 8.

No gaps, no placeholders, no drift. Plan is ready to execute.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-29-t2a-v1-web-roster.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, run two-stage review (spec compliance, then code quality) between tasks, fast iteration, all in this session.
2. **Inline Execution** — Execute the tasks in this session via `executing-plans`, batch execution with checkpoints for your review.

Which approach?
