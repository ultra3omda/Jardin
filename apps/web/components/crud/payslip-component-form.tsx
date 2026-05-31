'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { payslipComponentSchema, type PayslipComponentValues } from '@/lib/validation/hr.schemas';

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface PayslipComponentFormProps {
  pending: boolean;
  onSubmit: (values: PayslipComponentValues) => void;
}

export function PayslipComponentForm({ pending, onSubmit }: PayslipComponentFormProps) {
  const form = useForm<PayslipComponentValues>({
    resolver: zodResolver(payslipComponentSchema),
    defaultValues: { label: '', kind: 'EARNING', amount: 0 },
  });

  const handle = form.handleSubmit((values) => {
    onSubmit(values);
    form.reset({ label: '', kind: 'EARNING', amount: 0 });
  });

  return (
    <Form {...form}>
      <form onSubmit={handle} className="flex flex-wrap items-end gap-2">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Libellé</FormLabel>
              <FormControl>
                <Input placeholder="Prime de rentrée" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field}>
                  <option value="EARNING">Gain</option>
                  <option value="DEDUCTION">Retenue</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant (TND)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  className="w-32"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? 0 : e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          Ajouter
        </Button>
      </form>
    </Form>
  );
}
