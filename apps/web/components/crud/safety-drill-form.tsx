'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  safetyDrillSchema,
  DRILL_TYPES,
  type SafetyDrillValues,
} from '@/lib/validation/security.schemas';

const TYPE_LABELS: Record<(typeof DRILL_TYPES)[number], string> = {
  FIRE: 'Incendie',
  EARTHQUAKE: 'Séisme',
  LOCKDOWN: 'Confinement',
  OTHER: 'Autre',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface SafetyDrillFormProps {
  defaultValues?: Partial<SafetyDrillValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: SafetyDrillValues) => void;
  onCancel: () => void;
}

export function SafetyDrillForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: SafetyDrillFormProps) {
  const form = useForm<SafetyDrillValues>({
    resolver: zodResolver(safetyDrillSchema),
    defaultValues: { type: 'FIRE', conductedAt: '', notes: '', ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d&apos;exercice</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'FIRE'}>
                  {DRILL_TYPES.map((t) => (
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
          name="conductedAt"
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
          name="durationMin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durée (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="15"
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Évacuation complète en 3 min." {...field} value={field.value ?? ''} />
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
