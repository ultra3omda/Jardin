'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  securityIncidentSchema,
  INCIDENT_TYPES,
  SEVERITIES,
  type SecurityIncidentValues,
} from '@/lib/validation/security.schemas';

const TYPE_LABELS: Record<(typeof INCIDENT_TYPES)[number], string> = {
  INTRUSION: 'Intrusion',
  THEFT: 'Vol',
  INJURY: 'Blessure',
  FIRE: 'Incendie',
  OTHER: 'Autre',
};
const SEVERITY_LABELS: Record<(typeof SEVERITIES)[number], string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface SecurityIncidentFormProps {
  defaultValues?: Partial<SecurityIncidentValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: SecurityIncidentValues) => void;
  onCancel: () => void;
}

export function SecurityIncidentForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: SecurityIncidentFormProps) {
  const form = useForm<SecurityIncidentValues>({
    resolver: zodResolver(securityIncidentSchema),
    defaultValues: {
      type: 'INTRUSION',
      severity: 'LOW',
      location: '',
      occurredAt: '',
      description: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'INTRUSION'}>
                  {INCIDENT_TYPES.map((t) => (
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
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gravité</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'LOW'}>
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
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu</FormLabel>
              <FormControl>
                <Input placeholder="Zone nord" {...field} value={field.value ?? ''} />
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Individu non identifié observé près de la clôture." {...field} />
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
