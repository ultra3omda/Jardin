'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { healthRecordSchema, type HealthRecordValues } from '@/lib/validation/health.schemas';

export interface HealthRecordFormProps {
  defaultValues?: Partial<HealthRecordValues>;
  /** When true the studentId field is hidden (record already bound to a student). */
  hideStudentId?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: HealthRecordValues) => void;
  onCancel: () => void;
}

const TEXT_FIELDS: { name: keyof HealthRecordValues; label: string; placeholder: string }[] = [
  { name: 'bloodType', label: 'Groupe sanguin', placeholder: 'O+' },
  { name: 'allergies', label: 'Allergies', placeholder: 'Arachides' },
  { name: 'chronicConditions', label: 'Affections chroniques', placeholder: 'Asthme léger' },
  { name: 'medications', label: 'Traitements', placeholder: 'Ventoline si besoin' },
  { name: 'dietaryRestrictions', label: 'Régime alimentaire', placeholder: 'Sans porc' },
  { name: 'doctorName', label: 'Médecin traitant', placeholder: 'Dr. Mansour' },
  { name: 'doctorPhone', label: 'Téléphone médecin', placeholder: '+216 ...' },
  { name: 'emergencyContactName', label: "Contact d'urgence", placeholder: 'Mère — Fatma' },
  { name: 'emergencyContactPhone', label: "Téléphone d'urgence", placeholder: '+216 ...' },
  { name: 'notes', label: 'Notes', placeholder: 'Informations complémentaires' },
];

export function HealthRecordForm({
  defaultValues,
  hideStudentId,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: HealthRecordFormProps) {
  const form = useForm<HealthRecordValues>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      studentId: '',
      bloodType: '',
      allergies: '',
      chronicConditions: '',
      medications: '',
      dietaryRestrictions: '',
      doctorName: '',
      doctorPhone: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      notes: '',
      ...defaultValues,
    },
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
                <FormLabel>Identifiant de l&apos;élève</FormLabel>
                <FormControl>
                  <Input placeholder="ID élève" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {TEXT_FIELDS.map((f) => (
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
