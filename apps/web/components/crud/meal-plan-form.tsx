'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentPicker } from '@/components/pickers/student-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { mealPlanSchema, REGIMES, type MealPlanValues } from '@/lib/validation/canteen.schemas';

const REGIME_LABELS: Record<(typeof REGIMES)[number], string> = {
  STANDARD: 'Standard',
  VEGETARIAN: 'Végétarien',
  HALAL: 'Halal',
  NO_PORK: 'Sans porc',
  OTHER: 'Autre',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface MealPlanFormProps {
  defaultValues?: Partial<MealPlanValues>;
  hideStudentId?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: MealPlanValues) => void;
  onCancel: () => void;
}

export function MealPlanForm({
  defaultValues,
  hideStudentId,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: MealPlanFormProps) {
  const form = useForm<MealPlanValues>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: { studentId: '', regime: 'STANDARD', allergies: '', active: true, notes: '', ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!hideStudentId && (
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
        )}
        <FormField
          control={form.control}
          name="regime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Régime</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'STANDARD'}>
                  {REGIMES.map((r) => (
                    <option key={r} value={r}>
                      {REGIME_LABELS[r]}
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
          name="allergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergies</FormLabel>
              <FormControl>
                <Input placeholder="Arachides" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.value ?? true}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Inscription active à la cantine</span>
              </label>
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
                <Input placeholder="Informations complémentaires" {...field} value={field.value ?? ''} />
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
