'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentPicker } from '@/components/pickers/student-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  transportAssignmentSchema,
  DIRECTIONS,
  type TransportAssignmentValues,
} from '@/lib/validation/transport.schemas';
import type { BusRoute } from '@/lib/api/transport';

const DIRECTION_LABELS: Record<(typeof DIRECTIONS)[number], string> = {
  MORNING: 'Matin',
  EVENING: 'Soir',
  BOTH: 'Aller-retour',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface TransportAssignmentFormProps {
  routes: BusRoute[];
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: TransportAssignmentValues) => void;
  onCancel: () => void;
}

export function TransportAssignmentForm({
  routes,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: TransportAssignmentFormProps) {
  const form = useForm<TransportAssignmentValues>({
    resolver: zodResolver(transportAssignmentSchema),
    defaultValues: { studentId: '', routeId: '', stopId: '', direction: 'BOTH' },
  });

  const selectedRouteId = form.watch('routeId');
  const stops = routes.find((r) => r.id === selectedRouteId)?.stops ?? [];

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
          name="routeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ligne</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                  <option value="">— Choisir une ligne —</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
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
          name="stopId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Arrêt (optionnel)</FormLabel>
              <FormControl>
                <select
                  className={SELECT_CLASS}
                  {...field}
                  value={field.value ?? ''}
                  disabled={stops.length === 0}
                >
                  <option value="">— Aucun —</option>
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direction</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'BOTH'}>
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {DIRECTION_LABELS[d]}
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
