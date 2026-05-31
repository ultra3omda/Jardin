'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { canteenMenuSchema, type CanteenMenuValues } from '@/lib/validation/canteen.schemas';

export interface CanteenMenuFormProps {
  defaultValues?: Partial<CanteenMenuValues>;
  /** Hide the date field on edit (date is the natural key, not editable). */
  hideDate?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: CanteenMenuValues) => void;
  onCancel: () => void;
}

const FIELDS: { name: keyof CanteenMenuValues; label: string; placeholder: string }[] = [
  { name: 'starter', label: 'Entrée', placeholder: 'Salade de carottes' },
  { name: 'main', label: 'Plat', placeholder: 'Poulet rôti, riz' },
  { name: 'dessert', label: 'Dessert', placeholder: 'Yaourt nature' },
  { name: 'vegetarian', label: 'Option végétarienne', placeholder: 'Gratin de légumes' },
];

export function CanteenMenuForm({
  defaultValues,
  hideDate,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: CanteenMenuFormProps) {
  const form = useForm<CanteenMenuValues>({
    resolver: zodResolver(canteenMenuSchema),
    defaultValues: { date: '', starter: '', main: '', dessert: '', vegetarian: '', ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!hideDate && (
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
        )}
        {FIELDS.map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{f.label}</FormLabel>
                <FormControl>
                  <Input placeholder={f.placeholder} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
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
