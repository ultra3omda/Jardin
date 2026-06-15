'use client';

import { Link } from '@/i18n/routing';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormPage, FormSection, FormField } from '@/components/crud/form-page';
import { useUnsavedChanges } from '@/lib/ui/use-unsaved-changes';
import { ApiError } from '@/lib/api/http';
import {
  createContractUploadUrl,
  createOrganization,
  type CreateOrganizationInput,
  type CreateOrganizationResponse,
  type TenantType,
} from '@/lib/api/commercial';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const TYPE_LABELS: Record<TenantType, string> = {
  KINDERGARTEN: "Jardin d'enfants",
  PRIMARY_SCHOOL: 'École primaire',
  MIXED: 'Mixte (jardin + primaire)',
};

interface FormState {
  name: string;
  slug: string;
  type: TenantType;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  reference: string;
  signedAt: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  type: 'PRIMARY_SCHOOL',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  reference: '',
  signedAt: '',
  startDate: '',
  endDate: '',
  notes: '',
};

export function CreateOrganizationForm() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateOrganizationResponse | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!accessToken) return;
    // The signed contract is optional — it can be attached later. When a PDF is
    // provided, the signature & start dates become required so the record is
    // complete.
    if (file && (!form.signedAt || !form.startDate)) {
      setError('Renseignez la date de signature et la date de début du contrat.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let contract: CreateOrganizationInput['contract'];
      if (file) {
        // 1) presigned upload → 2) PUT PDF to R2 → 3) attach fileKey.
        const { uploadUrl, fileKey } = await createContractUploadUrl(
          accessToken,
          file.name,
          'application/pdf',
        );
        const put = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          body: file,
        });
        if (!put.ok) throw new Error('Échec du téléversement du contrat.');
        contract = {
          reference: form.reference.trim() || undefined,
          fileKey,
          fileName: file.name,
          signedAt: form.signedAt,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          notes: form.notes.trim() || undefined,
        };
      }

      const res = await createOrganization(accessToken, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        type: form.type,
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        ...(contract ? { contract } : {}),
      });
      setSuccess(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY) || file !== null;
  useUnsavedChanges(isDirty);

  if (success) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">
          ✅ Organisation « {success.organization.name} » créée
        </h2>
        <p className="text-sm text-emerald-800">
          {success.inviteEmailSent
            ? "Un email d'invitation a été envoyé à l'administrateur."
            : "⚠ Email non envoyé — transmettez le lien d'invitation manuellement."}
        </p>
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lien d&apos;invitation admin
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{success.invite.url}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(success.invite.url)}
              className="rounded border px-2 py-1 text-xs hover:bg-muted"
            >
              Copier
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/commercial" className="text-sm font-medium text-primary hover:underline">
            Voir mes organisations
          </Link>
          <Button
            onClick={() => {
              setSuccess(null);
              setForm(EMPTY);
              setFile(null);
            }}
          >
            En créer une autre
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FormPage
      title="Nouvelle organisation"
      description="Créez l'établissement et invitez son administrateur."
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Créer l'organisation"
      cancelHref="/commercial"
    >
      <FormSection legend="Établissement">
        <FormField label="Nom de l'établissement">
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} placeholder="École Saint Pierre" />
        </FormField>
        <FormField label="Slug (URL)" hint="Lettres minuscules, chiffres, tirets. 3-63 caractères.">
          <input className={`${inputClass} font-mono`} value={form.slug} onChange={(e) => set('slug', e.target.value)} required placeholder="saint-pierre" />
        </FormField>
        <FormField label="Type d'établissement">
          <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value as TenantType)}>
            {(Object.keys(TYPE_LABELS) as TenantType[]).map((k) => (
              <option key={k} value={k}>{TYPE_LABELS[k]}</option>
            ))}
          </select>
        </FormField>
      </FormSection>

      <FormSection legend="Administrateur à inviter">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Prénom">
            <input className={inputClass} value={form.adminFirstName} onChange={(e) => set('adminFirstName', e.target.value)} required />
          </FormField>
          <FormField label="Nom">
            <input className={inputClass} value={form.adminLastName} onChange={(e) => set('adminLastName', e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Email de l'administrateur">
          <input type="email" className={inputClass} value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} required />
        </FormField>
      </FormSection>

      <FormSection legend="Contrat signé" optional>
        <p className="text-xs text-muted-foreground">
          Vous pouvez créer l&apos;organisation sans contrat et le rattacher plus tard.
        </p>
        <FormField label="Référence (optionnel)">
          <input className={inputClass} value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="KL-2026-0042" />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Date de signature">
            <input type="date" className={inputClass} value={form.signedAt} onChange={(e) => set('signedAt', e.target.value)} />
          </FormField>
          <FormField label="Début">
            <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </FormField>
          <FormField label="Fin (optionnel)">
            <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Fichier du contrat (PDF, optionnel)">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button asChild type="button" variant="outline">
                <span>Choisir le fichier</span>
              </Button>
            </label>
            <span className="text-sm text-muted-foreground">
              {file ? file.name : 'Aucun fichier sélectionné'}
            </span>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-sm font-medium text-rose-600 hover:underline"
              >
                Retirer
              </button>
            )}
          </div>
        </FormField>
        <FormField label="Notes (optionnel)">
          <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </FormField>
      </FormSection>
    </FormPage>
  );
}

const inputClass = 'block w-full rounded-md border bg-background px-3 py-2 text-sm';
