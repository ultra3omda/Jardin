'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  infirmaryVisitSchema,
  OUTCOMES,
  type InfirmaryVisitValues,
} from '@/lib/validation/health.schemas';

const OUTCOME_LABELS: Record<(typeof OUTCOMES)[number], string> = {
  RETURNED_TO_CLASS: 'Retour en classe',
  SENT_HOME: 'Renvoyé à la maison',
  REFERRED: 'Orienté (médecin)',
  EMERGENCY: 'Urgence',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface InfirmaryVisitFormProps {
  defaultValues?: Partial<InfirmaryVisitValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: InfirmaryVisitValues) => void;
  onCancel: () => void;
}

export function InfirmaryVisitForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: InfirmaryVisitFormProps) {
  const form = useForm<InfirmaryVisitValues>({
    resolver: zodResolver(infirmaryVisitSchema),
    defaultValues: {
      studentId: '',
      visitedAt: '',
      reason: '',
      treatment: '',
      outcome: 'RETURNED_TO_CLASS',
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
              <FormLabel>Identifiant de l&apos;élève</FormLabel>
              <FormControl>
                <Input placeholder="ID élève" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="visitedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & heure</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motif</FormLabel>
              <FormControl>
                <Input placeholder="Maux de tête" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="treatment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Soin apporté</FormLabel>
              <FormControl>
                <Input placeholder="Repos 30 min" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Température (°C)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min={30}
                  max={45}
                  placeholder="37.5"
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
        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue</FormLabel>
              <FormControl>
                <select
                  className={SELECT_CLASS}
                  {...field}
                  value={field.value ?? 'RETURNED_TO_CLASS'}
                >
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {OUTCOME_LABELS[o]}
                    </option>
                  ))}
                </select>
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
