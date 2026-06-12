import { z } from 'zod';

export const MOVEMENT_KINDS = ['INCOME', 'EXPENSE'] as const;
export const EXPENSE_METHODS = ['cash', 'cheque', 'bank_transfer'] as const;

export const openSessionSchema = z.object({
  openingFloat: z.coerce
    .number({ invalid_type_error: 'Montant invalide' })
    .min(0, 'Le fond de caisse doit être positif'),
  notes: z.string().trim().max(500).optional(),
});
export type OpenSessionValues = z.infer<typeof openSessionSchema>;

export const closeSessionSchema = z.object({
  countedAmount: z.coerce
    .number({ invalid_type_error: 'Montant invalide' })
    .min(0, 'Le montant compté doit être positif'),
  notes: z.string().trim().max(500).optional(),
});
export type CloseSessionValues = z.infer<typeof closeSessionSchema>;

export const addMovementSchema = z.object({
  kind: z.enum(MOVEMENT_KINDS),
  amount: z.coerce
    .number({ invalid_type_error: 'Montant invalide' })
    .gt(0, 'Le montant doit être supérieur à 0'),
  label: z.string().trim().min(1, 'Libellé requis').max(160),
});
export type AddMovementValues = z.infer<typeof addMovementSchema>;

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(160),
  phone: z.string().trim().max(40).optional(),
  email: z
    .string()
    .trim()
    .email('Email invalide')
    .max(160)
    .optional()
    .or(z.literal('')),
  taxId: z.string().trim().max(40).optional(),
});
export type CreateSupplierValues = z.infer<typeof createSupplierSchema>;

export const createExpenseSchema = z.object({
  category: z.string().trim().min(1, 'Catégorie requise').max(120),
  amount: z.coerce
    .number({ invalid_type_error: 'Montant invalide' })
    .gt(0, 'Le montant doit être supérieur à 0'),
  paidAt: z.string().trim().min(1, 'Date requise'),
  method: z.enum(EXPENSE_METHODS),
  supplierId: z.string().trim().optional(),
  reference: z.string().trim().max(120).optional(),
});
export type CreateExpenseValues = z.infer<typeof createExpenseSchema>;
