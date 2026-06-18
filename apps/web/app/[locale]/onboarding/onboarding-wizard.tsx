'use client';
import type * as React from 'react';

import { DEFAULT_BRAND } from '@ecole-saas/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ColorInput } from '@/components/ui/color-input';
import { refresh } from '@/lib/api/client';
import {
  completeOnboarding,
  getOnboardingStatus,
  type OnboardingStatus,
} from '@/lib/api/onboarding';
import { ApiError } from '@/lib/api/http';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const BRANDING_UPLOAD_URL = '/api/admin/tenant/branding/upload-url';

/**
 * GTM — Blocking onboarding wizard. The SCHOOL_ADMIN cannot reach the app
 * until they confirm their organization name and (optionally) pick colors +
 * logo. On success we refresh the session so the gate unlocks, then route to
 * the dashboard.
 */
export function OnboardingWizard() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clear = useAuthStore((s) => s.clear);
  const refreshedRef = useRef(false);

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRAND.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_BRAND.secondaryColor);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  // Bootstrap the session if landed directly on /onboarding.
  useEffect(() => {
    if (!isHydrated || accessToken || refreshedRef.current) return;
    refreshedRef.current = true;
    refresh()
      .then((session) => setSession(session))
      .catch(() => {
        clear();
        router.replace('/login' as never);
      });
  }, [isHydrated, accessToken, setSession, clear, router]);

  // Non SCHOOL_ADMIN have nothing to onboard — send them home.
  useEffect(() => {
    if (isHydrated && accessToken && user && user.role !== 'SCHOOL_ADMIN') {
      router.replace('/dashboard' as never);
    }
  }, [isHydrated, accessToken, user, router]);

  // Load current status (prefill name + brand). If already completed, leave.
  useEffect(() => {
    if (!accessToken) return;
    getOnboardingStatus(accessToken)
      .then((s) => {
        if (s.completed) {
          router.replace('/dashboard' as never);
          return;
        }
        setStatus(s);
        setName(s.organization.name);
        setPrimaryColor(s.brand.primaryColor);
        setSecondaryColor(s.brand.secondaryColor);
        setLogoUrl(s.brand.logoUrl);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur de chargement'));
  }, [accessToken, router]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    setLogoNotice(null);
    try {
      const res = await fetch(BRANDING_UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ kind: 'logo', contentType: file.type }),
      });
      if (!res.ok) throw new Error('upload-url failed');
      const { uploadUrl, finalUrl } = (await res.json()) as { uploadUrl: string; finalUrl: string };
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('R2 PUT failed');
      setLogoUrl(finalUrl);
    } catch {
      setLogoNotice("Le téléversement du logo est indisponible pour l'instant — vous pourrez l'ajouter plus tard.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!accessToken || name.trim().length < 2) {
      setError("Le nom de l'organisation est obligatoire (2 caractères minimum).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(accessToken, {
        name: name.trim(),
        brand: {
          primaryColor,
          secondaryColor,
          ...(logoUrl ? { logoUrl } : {}),
        },
      });
      // Refresh the session so the onboarding gate unlocks, then enter the app.
      const session = await refresh();
      setSession(session);
      router.replace('/dashboard' as never);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
      setError(msg);
      setSubmitting(false);
    }
  }

  if (!isHydrated || !accessToken || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-8 w-8 animate-spin text-ambre-500" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-4 py-10">
      <div className="w-full max-w-xl space-y-6 rounded-2xl border bg-white p-8 shadow-sm">
        <header className="space-y-1">
          <p className="text-sm font-medium text-ambre-600">Bienvenue sur Klasso</p>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Personnalisez votre établissement
          </h1>
          <p className="text-sm text-muted-foreground">
            Cette étape est obligatoire avant d&apos;accéder à votre application. Confirmez le nom
            de votre établissement et, si vous le souhaitez, ses couleurs et son logo.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="org-name" className="mb-1 block text-sm font-medium">
              Nom de l&apos;établissement <span className="text-rose-600">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              className="block w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="École Saint Pierre"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Couleur primaire</label>
              <ColorInput value={primaryColor} onChange={setPrimaryColor} label="Couleur primaire" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Couleur secondaire</label>
              <ColorInput value={secondaryColor} onChange={setSecondaryColor} label="Couleur secondaire" />
            </div>
          </div>

          <div>
            <label htmlFor="org-logo" className="mb-1 block text-sm font-medium">
              Logo (optionnel)
            </label>
            <input
              id="org-logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoChange}
              disabled={uploading}
              className="block w-full text-sm"
            />
            {logoUrl && (
              <p className="mt-1 text-xs text-emerald-600">✓ Logo prêt.</p>
            )}
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Téléversement…</p>}
            {logoNotice && <p className="mt-1 text-xs text-amber-600">{logoNotice}</p>}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Enregistrement…' : 'Accéder à mon application'}
          </Button>
        </form>
      </div>
    </div>
  );
}
