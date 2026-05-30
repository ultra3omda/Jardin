'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createDailyLogSchema, MOODS, type CreateDailyLogValues } from '@/lib/validation/journal.schemas';

const MOOD_LABELS: Record<(typeof MOODS)[number], string> = {
  HAPPY: 'Heureux',
  CALM: 'Calme',
  TIRED: 'Fatigué',
  UPSET: 'Contrarié',
  SICK: 'Malade',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface DailyLogFormProps {
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: CreateDailyLogValues) => void;
  onCancel: () => void;
}

export function DailyLogForm({ submitLabel, pending, onSubmit, onCancel }: DailyLogFormProps) {
  const form = useForm<CreateDailyLogValues>({
    resolver: zodResolver(createDailyLogSchema),
    defaultValues: { studentId: '', date: '', meals: '', nap: '', generalNote: '' },
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
          name="date"
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
          name="mood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Humeur</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? ''}>
                  <option value="">—</option>
                  {MOODS.map((m) => (
                    <option key={m} value={m}>
                      {MOOD_LABELS[m]}
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
          name="meals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repas</FormLabel>
              <FormControl>
                <Input placeholder="A bien mangé" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nap"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sieste</FormLabel>
              <FormControl>
                <Input placeholder="13h - 14h30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="generalNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note générale</FormLabel>
              <FormControl>
                <Input placeholder="Belle journée." {...field} />
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
