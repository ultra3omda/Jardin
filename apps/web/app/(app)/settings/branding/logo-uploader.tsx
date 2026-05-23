'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getBrandingUploadUrl } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface LogoUploaderProps {
  kind: 'logo' | 'favicon';
  currentUrl: string | null;
  onUploaded: (finalUrl: string) => void;
  label: string;
}

const MAX_BYTES = 500 * 1024;
const ALLOWED_LOGO = ['image/png', 'image/jpeg', 'image/svg+xml'];
const ALLOWED_FAVICON = [...ALLOWED_LOGO, 'image/x-icon', 'image/vnd.microsoft.icon'];

/**
 * V1.6 — Direct-to-R2 upload via presigned PUT URL.
 *  1. Client calls /api/admin/tenant/branding/upload-url → { uploadUrl, finalUrl }
 *  2. Client PUTs the file body to uploadUrl directly (no proxy through our API)
 *  3. onUploaded(finalUrl) is invoked → parent persists via PATCH /branding
 *
 * Validates MIME + size client-side BEFORE the round-trip (server-side
 * TenantBrandService also re-validates).
 */
export function LogoUploader({ kind, currentUrl, onUploaded, label }: LogoUploaderProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const allowed = kind === 'favicon' ? ALLOWED_FAVICON : ALLOWED_LOGO;

  async function handle(file: File) {
    setError(null);
    if (!allowed.includes(file.type)) {
      setError(
        `Format ${file.type || 'inconnu'} non supporté. Utilisez PNG, JPEG${
          kind === 'favicon' ? ', ICO' : ''
        } ou SVG.`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        `Fichier trop volumineux (${Math.round(file.size / 1024)} KB). Maximum 500 KB.`,
      );
      return;
    }
    if (!accessToken) {
      setError('Session expirée. Reconnectez-vous.');
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, finalUrl } = await getBrandingUploadUrl(
        accessToken,
        kind,
        file.type,
      );
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`Upload R2 a échoué : ${put.status}`);
      }
      onUploaded(finalUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={label}
            width={kind === 'favicon' ? 32 : 80}
            height={kind === 'favicon' ? 32 : 80}
            className="rounded border"
            unoptimized
          />
        ) : (
          <div
            className={`flex items-center justify-center rounded border border-dashed text-xs text-muted-foreground ${
              kind === 'favicon' ? 'h-8 w-8' : 'h-20 w-20'
            }`}
          >
            Aucun
          </div>
        )}
        <label className="cursor-pointer">
          <input
            type="file"
            accept={allowed.join(',')}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handle(f);
              e.target.value = '';
            }}
          />
          <Button asChild type="button" variant="outline" disabled={uploading}>
            <span>{uploading ? 'Upload…' : 'Téléverser'}</span>
          </Button>
        </label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
