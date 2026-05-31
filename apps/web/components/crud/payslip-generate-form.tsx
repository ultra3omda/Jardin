'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { generatePayslipSchema, type GeneratePayslipValues } from '@/lib/validation/hr.schemas';
import type { EmployeeOption } from '@/components/crud/employment-contract-form';

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface PayslipGenerateFormProps {
  employees: EmployeeOption[];
  pending: boolean;
  onSubmit: (values: GeneratePayslipValues) => void;
  onCancel: () => void;
}

export function PayslipGenerateForm({
  employees,
  pending,
  onSubmit,
  onCancel,
}: PayslipGenerateFormProps) {
  const form = useForm<GeneratePayslipValues>({
    resolver: zodResolver(generatePayslipSchema),
    defaultValues: { userId: '', period: '', notes: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employé</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field}>
                  <option value="" disabled>
                    Sélectionner un employé…
                  </option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Période</FormLabel>
              <FormControl>
                <Input type="month" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Le bulletin est généré à partir du salaire du contrat actif de l&apos;employé.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'En cours…' : 'Générer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
