import { z } from 'zod';

export const ROUTE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const DIRECTIONS = ['MORNING', 'EVENING', 'BOTH'] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const busRouteSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(120),
  driverName: z.string().max(160).optional(),
  driverPhone: z.string().max(40).optional(),
  vehiclePlate: z.string().max(20).optional(),
  departureTime: z.string().regex(HHMM, 'Format HH:mm'),
  returnTime: z
    .string()
    .regex(HHMM, 'Format HH:mm')
    .optional()
    .or(z.literal('')),
  status: z.enum(ROUTE_STATUSES).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
});
export type BusRouteValues = z.infer<typeof busRouteSchema>;

export const transportAssignmentSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  routeId: z.string().min(1, 'Ligne requise'),
  stopId: z.string().optional(),
  direction: z.enum(DIRECTIONS).optional(),
});
export type TransportAssignmentValues = z.infer<typeof transportAssignmentSchema>;
