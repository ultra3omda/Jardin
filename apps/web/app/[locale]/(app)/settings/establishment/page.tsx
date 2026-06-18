'use client';
import type * as React from 'react';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Palette, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  type: string;
  locale: string;
  timezone: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface BrandingInfo {
  primaryColor: string;
  primaryHover: string;
  secondaryColor: string;
  emailHeaderColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
}

const TENANT_TYPE_LABELS: Record<string, string> = {
  SCHOOL: 'École Primaire',
  KINDERGARTEN: "Jardin d'Enfants",
  COLLEGE: 'Collège',
  LYCEE: 'Lycée',
  PRIVATE_SCHOOL: 'École Privée',
};

const LOCALE_LABELS: Record<string, string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
};

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description?: string;
}

function ColorField({ label, value, onChange, description }: ColorFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-800 mb-1">{label}</label>
      {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#f59e0b'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-md border cursor-pointer p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="w-28 rounded-md border px-3 py-2 text-sm font-mono"
          maxLength={7}
          placeholder="#000000"
        />
        <div
          className="h-10 w-10 rounded-md border shadow-sm flex-shrink-0"
          style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#f59e0b' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function EstablishmentPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    primaryColor: '#f59e0b',
    primaryHover: '#d97706',
    secondaryColor: '#1e3a5f',
    emailHeaderColor: '#f59e0b',
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(null);
    try {
      const [meRes, brandRes] = await Promise.allSettled([
        apiFetch<{ user: UserInfo; tenant: TenantInfo | null }>('/api/auth/me', token),
        apiFetch<BrandingInfo>('/api/admin/tenant/branding', token),
      ]);
      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.user);
        setTenant(meRes.value.tenant);
      } else {
        setFetchError("Impossible de charger les informations de l'établissement.");
      }
      if (brandRes.status === 'fulfilled') {
        const b = brandRes.value;
        setForm({
          primaryColor: b.primaryColor ?? '#f59e0b',
          primaryHover: b.primaryHover ?? '#d97706',
          secondaryColor: b.secondaryColor ?? '#1e3a5f',
          emailHeaderColor: b.emailHeaderColor ?? '#f59e0b',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await apiFetch('/api/admin/tenant/branding', token, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-56 rounded bg-slate-200" />
        <div className="h-4 w-80 rounded bg-slate-100" />
        <div className="h-52 rounded-xl bg-slate-100" />
        <div className="h-64 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Établissement</h1>
        <p className="text-sm text-muted-foreground">
          Informations générales et personnalisation visuelle de votre école.
        </p>
      </header>

      {fetchError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Informations générales */}
      <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <Building2 className="h-5 w-5 text-ambre-500" />
          <h2 className="text-base font-semibold text-navy-900">Informations générales</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Nom de l&apos;établissement
            </p>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm font-medium text-navy-900">
              {tenant?.name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Type
            </p>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-navy-900">
              {tenant?.type ? (TENANT_TYPE_LABELS[tenant.type] ?? tenant.type) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Identifiant (slug)
            </p>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm font-mono text-navy-700">
              {tenant?.slug ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Langue
            </p>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-navy-900">
              {tenant?.locale ? (LOCALE_LABELS[tenant.locale] ?? tenant.locale) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Fuseau horaire
            </p>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-navy-900">
              {tenant?.timezone ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Identifiant tenant
            </p>
            <p className="rounded-md border bg-slate-50 px-3 py-2 text-xs font-mono text-navy-500 truncate">
              {tenant?.id ?? '—'}
            </p>
          </div>
        </div>
        <div className="border-t bg-slate-50/60 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Pour modifier le nom ou le type de l&apos;établissement, contactez{' '}
            <a href="mailto:support@klasso.tn" className="underline hover:text-navy-700">
              support@klasso.tn
            </a>.
          </p>
        </div>
      </section>

      {/* Personnalisation des couleurs */}
      <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <Palette className="h-5 w-5 text-ambre-500" />
          <h2 className="text-base font-semibold text-navy-900">Personnalisation visuelle</h2>
        </div>
        <form onSubmit={(e) => { void handleSaveBranding(e); }}>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
            <ColorField
              label="Couleur principale"
              value={form.primaryColor}
              onChange={(v) => setForm((f) => ({ ...f, primaryColor: v }))}
              description="Boutons, liens et éléments interactifs"
            />
            <ColorField
              label="Couleur principale (survol)"
              value={form.primaryHover}
              onChange={(v) => setForm((f) => ({ ...f, primaryHover: v }))}
              description="État hover des éléments principaux"
            />
            <ColorField
              label="Couleur secondaire"
              value={form.secondaryColor}
              onChange={(v) => setForm((f) => ({ ...f, secondaryColor: v }))}
              description="En-têtes, navigation et accents"
            />
            <ColorField
              label={"Couleur d'en-tête email"}
              value={form.emailHeaderColor}
              onChange={(v) => setForm((f) => ({ ...f, emailHeaderColor: v }))}
              description="En-tête des emails envoyés aux parents"
            />
          </div>
          {saveError && (
            <div className="mx-6 mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {saveError}
            </div>
          )}
          <div className="flex items-center justify-between border-t bg-slate-50/60 px-6 py-4">
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <CheckCircle className="h-4 w-4" />
                Couleurs sauvegardées
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Les changements sont appliqués immédiatement.
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 text-sm font-medium text-white disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enregistrement…' : 'Sauvegarder les couleurs'}
            </button>
          </div>
        </form>
      </section>

      {/* Compte administrateur */}
      {user && (
        <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <User className="h-5 w-5 text-ambre-500" />
            <h2 className="text-base font-semibold text-navy-900">Compte administrateur</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Nom complet
              </p>
              <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-navy-900">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Email
              </p>
              <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-navy-900">
                {user.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Rôle
              </p>
              <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-navy-900">
                {user.role === 'SCHOOL_ADMIN' ? 'Administrateur' : user.role}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
