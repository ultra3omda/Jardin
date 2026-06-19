'use client';
import type * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@/i18n/routing';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  AdminApiError,
  createTenant,
  type CreateTenantResponse,
} from '@/lib/api/admin-tenants';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import {
  createTenantSchema,
  type CreateTenantFormValues,
} from '@/lib/validation/tenant.schemas';

const TYPE_LABELS: Record<CreateTenantFormValues['type'], string> = {
  KINDERGARTEN: "Jardin d'enfants",
  PRIMARY_SCHOOL: 'École primaire',
  MIXED: 'Mixte (jardin + primaire)',
};

export function CreateTenantForm() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [success, setSuccess] = useState<CreateTenantResponse | null>(null);

  const form = useForm<CreateTenantFormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      type: 'PRIMARY_SCHOOL',
      locale: 'fr',
      sendInviteEmail: true,
      primaryColor: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateTenantFormValues) => createTenant(accessToken!, values),
    onSuccess: (res) => setSuccess(res),
  });

  if (success) {
    return (
      <SuccessPanel
        response={success}
        onCreateAnother={() => { setSuccess(null); form.reset(); }}
      />
    );
  }

  return (
    <form
      className="space-y-5 rounded-lg border bg-card p-6"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <Field label="Nom de l'école" error={form.formState.errors.name?.message}>
        <input
          type="text"
          {...form.register('name')}
          className="block w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="École Saint Pierre"
        />
      </Field>

      <Field label="Slug (URL)" error={form.formState.errors.slug?.message}>
        <input
          type="text"
          {...form.register('slug')}
          className="block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          placeholder="saint-pierre"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Lettres minuscules, chiffres, tirets. 3-63 caractères.
        </p>
      </Field>

      <Field label="Type d'établissement" error={form.formState.errors.type?.message}>
        <select {...form.register('type')} className="block w-full rounded-md border bg-background px-3 py-2 text-sm">
          {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((k) => (
            <option key={k} value={k}>{TYPE_LABELS[k]}</option>
          ))}
        </select>
      </Field>

      <Field label="Langue par défaut" error={form.formState.errors.locale?.message}>
        <select {...form.register('locale')} className="block w-full rounded-md border bg-background px-3 py-2 text-sm">
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
          <option value="es">Español</option>
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prénom de l'admin" error={form.formState.errors.adminFirstName?.message}>
          <input type="text" {...form.register('adminFirstName')} className="block w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </Field>
        <Field label="Nom de l'admin" error={form.formState.errors.adminLastName?.message}>
          <input type="text" {...form.register('adminLastName')} className="block w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </Field>
      </div>

      <Field label="Email de l'admin" error={form.formState.errors.adminEmail?.message}>
        <input type="email" {...form.register('adminEmail')} className="block w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </Field>

      <Field label="Couleur primaire (optionnel)" error={form.formState.errors.primaryColor?.message}>
        <input
          type="text"
          {...form.register('primaryColor')}
          className="block w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          placeholder="#6366f1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          L&apos;admin pourra personnaliser depuis /settings/branding.
        </p>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register('sendInviteEmail')} />
        Envoyer l&apos;email d&apos;invitation (Resend)
      </label>

      {mutation.isError && (
        <p className="text-sm text-rose-600">{(mutation.error as AdminApiError).message}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Link href="/admin/tenants" className="text-sm font-medium text-muted-foreground hover:underline">
          Annuler
        </Link>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Création...' : "Créer l'école"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const DOMAIN_STATUS_LABEL: Record<CreateTenantResponse['domainStatus'], string> = {
  PROVISIONING: 'Domaine en cours de provisioning…',
  ACTIVE: 'Domaine actif',
  FAILED: 'Échec du provisioning du domaine',
  NONE: '',
};

function SuccessPanel({
  response,
  onCreateAnother,
}: { response: CreateTenantResponse; onCreateAnother: () => void }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ecole-saas-weld.vercel.app';
  const webUrl = `${appUrl}/t/${response.tenant.slug}/login`;
  const mobileUrl = 'https://klasso-mobile.vercel.app';
  const customDomainUrl = response.tenant.customDomain
    ? `https://${response.tenant.customDomain}/login`
    : null;

  return (
    <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="text-lg font-semibold text-emerald-900">
        ✅ École « {response.tenant.name} » créée
      </h2>

      {customDomainUrl && (
        <UrlCard
          label="Domaine dédié"
          url={customDomainUrl}
          note={DOMAIN_STATUS_LABEL[response.tenant.domainStatus] || undefined}
        />
      )}
      <UrlCard label="Web (page connexion)" url={webUrl} />
      <UrlCard label="Mobile preview" url={mobileUrl} note={`Code école : ${response.tenant.slug}`} />

      {response.invite ? (
        <UrlCard
          label="Lien d'invitation admin"
          url={response.invite.url}
          note={response.inviteEmailSent ? '✓ Email envoyé via Resend' : '⚠ Email NON envoyé — copie le lien manuellement'}
        />
      ) : (
        <div className="rounded-md border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invitation admin
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Le domaine{' '}
            {response.tenant.customDomain ? (
              <code className="rounded bg-muted px-1 py-0.5">{response.tenant.customDomain}</code>
            ) : (
              'dédié'
            )}{' '}
            est en cours de provisioning. L&apos;email d&apos;invitation partira automatiquement
            une fois le domaine actif. Suis l&apos;état sur la fiche de l&apos;école.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Link href={`/admin/tenants/${response.tenant.id}`} className="text-sm font-medium text-primary hover:underline">
          Voir détail
        </Link>
        <Button onClick={onCreateAnother}>Créer une autre école</Button>
      </div>
    </div>
  );
}

function UrlCard({ label, url, note }: { label: string; url: string; note?: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(url)}
          className="rounded border px-2 py-1 text-xs hover:bg-muted"
        >
          Copier
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-xs hover:bg-muted">
          Ouvrir ↗
        </a>
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
