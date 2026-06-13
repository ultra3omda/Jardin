import { useQuery } from '@tanstack/react-query';
import { fetchApi } from './client';

/**
 * Transport scolaire — lignes de bus (admin / personnel).
 * Miroir de apps/api/src/transport/bus-routes.controller.ts.
 */
export type RouteStatus = 'ACTIVE' | 'INACTIVE';

export interface BusStop {
  id: string;
  name: string;
  order: number;
  pickupTime?: string | null;
}

export interface BusRoute {
  id: string;
  name: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehiclePlate?: string | null;
  departureTime: string;
  returnTime?: string | null;
  status: RouteStatus;
  capacity?: number | null;
  stops: BusStop[];
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusRouteInput {
  name: string;
  departureTime: string;
  returnTime?: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  capacity?: number;
}

interface ListBusRoutesResponse {
  items: BusRoute[];
  total: number;
}

export const BUS_ROUTES_KEY = ['bus-routes'] as const;

function clean<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function useBusRoutes() {
  return useQuery({
    queryKey: BUS_ROUTES_KEY,
    queryFn: () => fetchApi<ListBusRoutesResponse>('/api/bus-routes'),
  });
}

export function createBusRoute(input: CreateBusRouteInput): Promise<BusRoute> {
  return fetchApi<BusRoute>('/api/bus-routes', {
    method: 'POST',
    body: JSON.stringify(clean(input)),
  });
}

export function deleteBusRoute(id: string): Promise<void> {
  return fetchApi<void>(`/api/bus-routes/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Affectations transport (élève ↔ ligne) — T2b
// Miroir de apps/api/src/transport/transport-assignments.controller.ts.
// ---------------------------------------------------------------------------

export type TransportDirection = 'MORNING' | 'EVENING' | 'BOTH';

export interface TransportAssignment {
  id: string;
  studentId: string;
  studentName: string;
  routeId: string;
  routeName: string;
  stopId?: string | null;
  stopName?: string | null;
  direction: TransportDirection;
  createdAt: string;
}

interface ListTransportAssignmentsResponse {
  items: TransportAssignment[];
  total: number;
}

export const transportAssignmentsKey = (routeId: string) =>
  ['transport-assignments', routeId] as const;

export function useTransportAssignments(routeId: string | null) {
  return useQuery({
    queryKey: ['transport-assignments', routeId ?? 'none'] as const,
    queryFn: () =>
      fetchApi<ListTransportAssignmentsResponse>(
        `/api/transport-assignments?routeId=${encodeURIComponent(routeId as string)}`,
      ),
    enabled: !!routeId,
  });
}

export interface CreateTransportAssignmentInput {
  studentId: string;
  routeId: string;
  direction?: TransportDirection;
}

export function createTransportAssignment(
  input: CreateTransportAssignmentInput,
): Promise<TransportAssignment> {
  return fetchApi<TransportAssignment>('/api/transport-assignments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteTransportAssignment(id: string): Promise<void> {
  return fetchApi<void>(`/api/transport-assignments/${id}`, { method: 'DELETE' });
}

/**
 * Reconcile the currently-assigned students of a route against a new selection.
 * The API only exposes single create/delete, so the sheet computes the delta.
 */
export function diffStudentAssignments(
  current: readonly string[],
  selected: readonly string[],
): { toAdd: string[]; toRemove: string[] } {
  const currentSet = new Set(current);
  const selectedSet = new Set(selected);
  return {
    toAdd: selected.filter((id) => !currentSet.has(id)),
    toRemove: current.filter((id) => !selectedSet.has(id)),
  };
}
