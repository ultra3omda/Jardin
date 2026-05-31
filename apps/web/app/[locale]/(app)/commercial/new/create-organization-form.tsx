'use client';

import { Link } from '@/i18n/routing';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/http';
import {
  createContractUploadUrl,
  createOrganization,
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
    if (!file) {
      setError('Veuillez joindre le contrat signé (PDF).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // 1) presigned upload → 2) PUT PDF to R2 → 3) create org with fileKey.
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

      const res = await createOrganization(accessToken, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        type: form.type,
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        contract: {
          reference: form.reference.trim() || undefined,
          fileKey,
          fileName: file.name,
          signedAt: form.signedAt,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      setSuccess(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
    <form className="space-y-5 rounded-lg border bg-card p-6" onSubmit={handleSubmit}>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-navy-900">Établissement</legend>
        <Field label="Nom de l'établissement">
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} placeholder="École Saint Pierre" />
        </Field>
        <Field label="Slug (URL)" hint="Lettres minuscules, chiffres, tirets. 3-63 caractères.">
          <input className={`${inputClass} font-mono`} value={form.slug} onChange={(e) => set('slug', e.target.value)} required placeholder="saint-pierre" />
        </Field>
        <Field label="Type d'établissement">
          <select className={inputClass} value={form.type} onChange={(e) => set('type', e.target.value as TenantType)}>
            {(Object.keys(TYPE_LABELS) as TenantType[]).map((k) => (
              <option key={k} value={k}>{TYPE_LABELS[k]}</option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-navy-900">Administrateur à inviter</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Prénom">
            <input className={inputClass} value={form.adminFirstName} onChange={(e) => set('adminFirstName', e.target.value)} required />
          </Field>
          <Field label="Nom">
            <input className={inputClass} value={form.adminLastName} onChange={(e) => set('adminLastName', e.target.value)} required />
          </Field>
        </div>
        <Field label="Email de l'administrateur">
          <input type="email" className={inputClass} value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} required />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-navy-900">Contrat signé</legend>
        <Field label="Référence (optionnel)">
          <input className={inputClass} value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="KL-2026-0042" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date de signature">
            <input type="date" className={inputClass} value={form.signedAt} onChange={(e) => set('signedAt', e.target.value)} required />
          </Field>
          <Field label="Début">
            <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
          </Field>
          <Field label="Fin (optionnel)">
            <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </Field>
        </div>
        <Field label="Fichier du contrat (PDF)">
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" required />
        </Field>
        <Field label="Notes (optionnel)">
          <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </fieldset>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Link href="/commercial" className="text-sm font-medium text-muted-foreground hover:underline">
          Annuler
        </Link>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Création…' : "Créer l'organisation"}
        </Button>
      </div>
    </form>
  );
}

const inputClass = 'block w-full rounded-md border bg-background px-3 py-2 text-sm';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
