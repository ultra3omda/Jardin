'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentPicker } from '@/components/pickers/student-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { vaccinationSchema, type VaccinationValues } from '@/lib/validation/health.schemas';

export interface VaccinationFormProps {
  defaultValues?: Partial<VaccinationValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: VaccinationValues) => void;
  onCancel: () => void;
}

export function VaccinationForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: VaccinationFormProps) {
  const form = useForm<VaccinationValues>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      studentId: '',
      vaccineName: '',
      administeredAt: '',
      nextDueAt: '',
      notes: '',
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
          name="vaccineName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vaccin</FormLabel>
              <FormControl>
                <Input placeholder="DTP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="administeredAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date d&apos;administration</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nextDueAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prochain rappel</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ''} />
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
                <Input placeholder="Rappel à prévoir" {...field} value={field.value ?? ''} />
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
