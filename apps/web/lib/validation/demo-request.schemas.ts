import { z } from 'zod';

export const demoRequestSchema = z.object({
  firstName: z.string().min(1, 'Requis').max(100),
  lastName: z.string().min(1, 'Requis').max(100),
  email: z.string().email('Email invalide').max(254),
  phone: z.string().regex(/^\+?[\d\s-]{8,20}$/, 'Format invalide').optional().or(z.literal('')),
  schoolName: z.string().min(2, 'Requis').max(200),
  studentsCount: z.enum(['<50', '50-200', '200-500', '500+']),
  message: z.string().max(2000).optional().or(z.literal('')),
  locale: z.enum(['fr', 'ar']),
  turnstileToken: z.string().min(10, 'Vérification anti-spam requise'),
});

export type DemoRequestFormValues = z.infer<typeof demoRequestSchema>;
