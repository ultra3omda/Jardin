import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type RouteStatus = 'ACTIVE' | 'INACTIVE';
export type TransportDirection = 'MORNING' | 'EVENING' | 'BOTH';

// ─── Bus routes (+ stops) ─────────────────────────────────────────────────────
export interface BusStop {
  id: string;
  name: string;
  order: number;
  pickupTime: string | null;
}
export interface BusRoute {
  id: string;
  name: string;
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  departureTime: string;
  returnTime: string | null;
  status: RouteStatus;
  capacity: number | null;
  stops: BusStop[];
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface ListBusRoutesResponse {
  items: BusRoute[];
  total: number;
}
export interface CreateBusStopInput {
  name: string;
  order: number;
  pickupTime?: string;
}
export interface CreateBusRouteInput {
  name: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  departureTime: string;
  returnTime?: string;
  status?: RouteStatus;
  capacity?: number;
  stops?: CreateBusStopInput[];
}
export type UpdateBusRouteInput = Omit<Partial<CreateBusRouteInput>, 'stops'>;

const ROUTES = '/api/bus-routes';
export const listBusRoutes = (token: string) => apiGet<ListBusRoutesResponse>(ROUTES, token);
export const createBusRoute = (token: string, input: CreateBusRouteInput) =>
  apiPost<BusRoute>(ROUTES, token, input);
export const updateBusRoute = (token: string, id: string, input: UpdateBusRouteInput) =>
  apiPatch<BusRoute>(`${ROUTES}/${id}`, token, input);
export const deleteBusRoute = (token: string, id: string) => apiDelete(`${ROUTES}/${id}`, token);
export const addBusStop = (token: string, routeId: string, input: CreateBusStopInput) =>
  apiPost<BusRoute>(`${ROUTES}/${routeId}/stops`, token, input);
export const removeBusStop = (token: string, routeId: string, stopId: string) =>
  apiDelete<BusRoute>(`${ROUTES}/${routeId}/stops/${stopId}`, token);

// ─── Transport assignments ────────────────────────────────────────────────────
export interface TransportAssignment {
  id: string;
  studentId: string;
  studentName: string;
  routeId: string;
  routeName: string;
  stopId: string | null;
  stopName: string | null;
  direction: TransportDirection;
  createdAt: string;
}
export interface ListTransportAssignmentsResponse {
  items: TransportAssignment[];
  total: number;
}
export interface CreateTransportAssignmentInput {
  studentId: string;
  routeId: string;
  stopId?: string;
  direction?: TransportDirection;
}
export type UpdateTransportAssignmentInput = Omit<
  Partial<CreateTransportAssignmentInput>,
  'studentId' | 'routeId'
>;

const ASSIGNMENTS = '/api/transport-assignments';
export const listTransportAssignments = (token: string) =>
  apiGet<ListTransportAssignmentsResponse>(ASSIGNMENTS, token);
export const createTransportAssignment = (token: string, input: CreateTransportAssignmentInput) =>
  apiPost<TransportAssignment>(ASSIGNMENTS, token, input);
export const updateTransportAssignment = (
  token: string,
  id: string,
  input: UpdateTransportAssignmentInput,
) => apiPatch<TransportAssignment>(`${ASSIGNMENTS}/${id}`, token, input);
export const deleteTransportAssignment = (token: string, id: string) =>
  apiDelete(`${ASSIGNMENTS}/${id}`, token);
