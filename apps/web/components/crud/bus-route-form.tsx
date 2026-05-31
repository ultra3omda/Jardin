'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { busRouteSchema, ROUTE_STATUSES, type BusRouteValues } from '@/lib/validation/transport.schemas';

const STATUS_LABELS: Record<(typeof ROUTE_STATUSES)[number], string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface BusRouteFormProps {
  defaultValues?: Partial<BusRouteValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: BusRouteValues) => void;
  onCancel: () => void;
}

export function BusRouteForm({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: BusRouteFormProps) {
  const form = useForm<BusRouteValues>({
    resolver: zodResolver(busRouteSchema),
    defaultValues: {
      name: '',
      driverName: '',
      driverPhone: '',
      vehiclePlate: '',
      departureTime: '',
      returnTime: '',
      status: 'ACTIVE',
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
              <FormLabel>Nom de la ligne</FormLabel>
              <FormControl>
                <Input placeholder="Ligne A — Nord" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="driverName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chauffeur</FormLabel>
              <FormControl>
                <Input placeholder="Rachid Hammouda" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="driverPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone chauffeur</FormLabel>
              <FormControl>
                <Input placeholder="+216 ..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vehiclePlate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immatriculation</FormLabel>
              <FormControl>
                <Input placeholder="TN-247-B" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="departureTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Départ</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="returnTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retour</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut</FormLabel>
              <FormControl>
                <select className={SELECT_CLASS} {...field} value={field.value ?? 'ACTIVE'}>
                  {ROUTE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
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
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacité (places)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="30"
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
