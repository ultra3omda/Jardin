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
