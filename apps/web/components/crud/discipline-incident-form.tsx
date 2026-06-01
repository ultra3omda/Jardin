'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentPicker } from '@/components/pickers/student-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { disciplineSchema, SEVERITIES, type DisciplineValues } from '@/lib/validation/discipline.schemas';

const SEVERITY_LABELS: Record<(typeof SEVERITIES)[number], string> = {
  MINOR: 'Mineur',
  MAJOR: 'Majeur',
  SUSPENSION: 'Suspension',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface DisciplineIncidentFormProps {
  defaultValues?: Partial<DisciplineValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: DisciplineValues) => void;
  onCancel: () => void;
}

export function DisciplineIncidentForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: DisciplineIncidentFormProps) {
  const form = useForm<DisciplineValues>({
    resolver: zodResolver(disciplineSchema),
    defaultValues: {
      studentId: '',
      type: 'MINOR',
      occurredAt: '',
      description: '',
      sanction: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Élève</FormLabel>
              <FormControl>
                <StudentPicker value={field.value ?? ''} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gravité</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'MINOR'}>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {SEVERITY_LABELS[s]}
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
          name="occurredAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Bavardage répété en cours." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sanction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sanction</FormLabel>
              <FormControl>
                <Input placeholder="Avertissement oral" {...field} />
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
