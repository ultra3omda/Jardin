'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { visitorLogSchema, type VisitorLogValues } from '@/lib/validation/security.schemas';

export interface VisitorLogFormProps {
  defaultValues?: Partial<VisitorLogValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: VisitorLogValues) => void;
  onCancel: () => void;
}

export function VisitorLogForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: VisitorLogFormProps) {
  const form = useForm<VisitorLogValues>({
    resolver: zodResolver(visitorLogSchema),
    defaultValues: {
      visitorName: '',
      reason: '',
      checkInAt: '',
      checkOutAt: '',
      badgeNumber: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="visitorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visiteur</FormLabel>
              <FormControl>
                <Input placeholder="M. Gharbi" {...field} />
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
                <Input placeholder="Rendez-vous direction" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="checkInAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entrée</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkOutAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sortie</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="badgeNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Badge</FormLabel>
              <FormControl>
                <Input placeholder="N°142" {...field} value={field.value ?? ''} />
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
