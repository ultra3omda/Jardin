'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ColorInput } from '@/components/ui/color-input';
import { Label } from '@/components/ui/label';
import { getBranding, resetBranding, updateBranding } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { brandingPatchSchema } from '@/lib/validation/branding.schemas';

import { LogoUploader } from './logo-uploader';

interface Props {
  initial: TenantBrand;
}

/**
 * V1.6 — Tenant branding editor. SCHOOL_ADMIN UI.
 *
 * On mount: re-fetches the live brand via /api/admin/tenant/branding so the
 * form always reflects DB state (page server fallback may be stale).
 * On save: PATCH + router.refresh() so the (app) layout re-renders with the
 * new CSS variables on the next paint.
 */
export function BrandingForm({ initial }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const [brand, setBrand] = useState<TenantBrand>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void getBranding(accessToken)
      .then((b) => {
        if (!cancelled) setBrand(b);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  function set<K extends keyof TenantBrand>(k: K, v: TenantBrand[K]) {
    setBrand((b) => ({ ...b, [k]: v }));
  }

  function save() {
    setError(null);
    if (!accessToken) {
      setError('Session expirée. Reconnectez-vous.');
      return;
    }
    const parsed = brandingPatchSchema.safeParse(brand);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')} : ${i.message}`)
          .join(' · '),
      );
      return;
    }
    startTransition(async () => {
      try {
        const updated = await updateBranding(accessToken, parsed.data);
        setBrand(updated);
        setSavedAt(new Date());
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      }
    });
  }

  function reset() {
    if (!accessToken) return;
    if (!confirm('Réinitialiser au thème indigo par défaut ?')) return;
    startTransition(async () => {
      const fresh = await resetBranding(accessToken).catch(() => DEFAULT_BRAND);
      setBrand(fresh);
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Couleurs</CardTitle>
          <CardDescription>
            Personnalisez l&apos;identité visuelle de votre école.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Couleur principale</Label>
              <ColorInput
                id="primaryColor"
                value={brand.primaryColor}
                onChange={(v) => set('primaryColor', v)}
                label="Couleur principale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryHover">Couleur principale (hover)</Label>
              <ColorInput
                id="primaryHover"
                value={brand.primaryHover}
                onChange={(v) => set('primaryHover', v)}
                label="Couleur principale hover"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Couleur secondaire</Label>
              <ColorInput
                id="secondaryColor"
                value={brand.secondaryColor}
                onChange={(v) => set('secondaryColor', v)}
                label="Couleur secondaire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailHeaderColor">Couleur d&apos;en-tête email</Label>
              <ColorInput
                id="emailHeaderColor"
                value={brand.emailHeaderColor}
                onChange={(v) => set('emailHeaderColor', v)}
                label="Couleur en-tête email"
              />
            </div>
          </div>
          <div className="pt-2">
            <Button type="button" style={{ background: brand.primaryColor }}>
              Aperçu d&apos;un bouton
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo &amp; favicon</CardTitle>
          <CardDescription>
            PNG ou SVG, 500 Ko max. Ne pas inclure de photos d&apos;élèves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUploader
            kind="logo"
            currentUrl={brand.logoUrl}
            label="Logo principal"
            onUploaded={(u) => set('logoUrl', u)}
          />
          <LogoUploader
            kind="favicon"
            currentUrl={brand.faviconUrl}
            label="Favicon"
            onUploaded={(u) => set('faviconUrl', u)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Domaine personnalisé</CardTitle>
          <CardDescription>Disponible avec l&apos;offre premium.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Utilisez votre propre domaine, par exemple{' '}
            <code>portail.votre-ecole.fr</code>, au lieu de l&apos;URL actuelle.
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {savedAt && (
        <p className="text-sm text-muted-foreground">
          Enregistré à {savedAt.toLocaleTimeString('fr-FR')}.
        </p>
      )}

      <div className="flex gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button variant="outline" onClick={reset} disabled={pending}>
          Réinitialiser au thème par défaut
        </Button>
      </div>
    </div>
  );
}
