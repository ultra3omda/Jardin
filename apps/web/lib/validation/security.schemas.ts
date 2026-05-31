import { z } from 'zod';

export const INCIDENT_TYPES = ['INTRUSION', 'THEFT', 'INJURY', 'FIRE', 'OTHER'] as const;
export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const DRILL_TYPES = ['FIRE', 'EARTHQUAKE', 'LOCKDOWN', 'OTHER'] as const;

export const securityIncidentSchema = z.object({
  type: z.enum(INCIDENT_TYPES),
  severity: z.enum(SEVERITIES).optional(),
  location: z.string().max(160).optional(),
  occurredAt: z.string().min(1, 'Date et heure requises'),
  description: z.string().min(1, 'Description requise').max(5000),
});
export type SecurityIncidentValues = z.infer<typeof securityIncidentSchema>;

export const visitorLogSchema = z.object({
  visitorName: z.string().min(1, 'Nom requis').max(160),
  reason: z.string().max(300).optional(),
  checkInAt: z.string().min(1, "Heure d'entrée requise"),
  checkOutAt: z.string().optional(),
  badgeNumber: z.string().max(40).optional(),
});
export type VisitorLogValues = z.infer<typeof visitorLogSchema>;

export const safetyDrillSchema = z.object({
  type: z.enum(DRILL_TYPES),
  conductedAt: z.string().min(1, 'Date requise'),
  durationMin: z.coerce.number().int().min(1).max(1440).optional(),
  notes: z.string().max(5000).optional(),
});
export type SafetyDrillValues = z.infer<typeof safetyDrillSchema>;
