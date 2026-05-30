'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { activitySchema, CATEGORIES, type ActivityValues } from '@/lib/validation/activities.schemas';

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  ART: 'Arts & Culture',
  MUSIC: 'Musique',
  SPORT: 'Sport',
  OUTING: 'Sortie',
  OTHER: 'Autre',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface ActivityFormProps {
  defaultValues?: Partial<ActivityValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: ActivityValues) => void;
  onCancel: () => void;
}

export function ActivityForm({ defaultValues, submitLabel, pending, onSubmit, onCancel }: ActivityFormProps) {
  const form = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: '',
      category: 'OTHER',
      description: '',
      scheduledAt: '',
      location: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Chorale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'OTHER'}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Chant choral hebdomadaire." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scheduledAt"
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
                  placeholder="60"
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
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu</FormLabel>
              <FormControl>
                <Input placeholder="Salle de musique" {...field} />
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
