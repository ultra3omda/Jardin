'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  employmentContractSchema,
  CONTRACT_TYPES,
  type EmploymentContractValues,
} from '@/lib/validation/hr.schemas';

const TYPE_LABELS: Record<(typeof CONTRACT_TYPES)[number], string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  VACATAIRE: 'Vacataire',
  TEMPS_PARTIEL: 'Temps partiel',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface EmployeeOption {
  id: string;
  label: string;
}

export interface EmploymentContractFormProps {
  employees: EmployeeOption[];
  defaultValues?: Partial<EmploymentContractValues>;
  /** Employee is immutable after creation. */
  employeeLocked?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: EmploymentContractValues) => void;
  onCancel: () => void;
}

export function EmploymentContractForm({
  employees,
  defaultValues,
  employeeLocked,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: EmploymentContractFormProps) {
  const form = useForm<EmploymentContractValues>({
    resolver: zodResolver(employmentContractSchema),
    defaultValues: {
      userId: '',
      type: 'CDI',
      startDate: '',
      endDate: '',
      baseSalary: 0,
      notes: '',
      ...defaultValues,
    },
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
                <select className={SELECT_CLASS} disabled={employeeLocked} {...field}>
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
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de contrat</FormLabel>
                <FormControl>
                  <select className={SELECT_CLASS} {...field} value={field.value ?? 'CDI'}>
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
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
            name="baseSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salaire de base (TND)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    placeholder="2200"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? 0 : e.target.valueAsNumber)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Début</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fin (optionnel)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="weeklyHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heures / semaine (optionnel)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={80}
                  placeholder="35"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                  }
                />
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
