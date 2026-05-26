'use client';

import { useState } from 'react';

import { getPhotoUploadUrl } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

/**
 * V2 — Module Élèves : widget photo upload R2.
 * - Avant création (studentId undefined) : preview local seulement
 * - Après création : POST /students/:id/photo-upload-url → PUT direct R2 → onUploaded(finalUrl)
 * Réutilise le pattern V1.6 tenant-brand.
 */
interface Props {
  studentId?: string;
  initialUrl?: string | null;
  initials: string;
  onUploaded: (publicUrl: string) => void;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED)[number];
const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoUpload({ studentId, initialUrl, initials, onUploaded }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (!ALLOWED.includes(file.type as AllowedMime)) {
      setError('Format autorisé : JPEG, PNG, WebP');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Taille max : 5 Mo');
      return;
    }

    // Immediate local preview (blob URL)
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    if (!studentId) {
      // Création non encore effectuée — upload différé (UX V2 simple : on
      // demande de sauvegarder d'abord puis revenir uploader sur la fiche).
      // V3 améliorera avec un upload deferred-then-PATCH.
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, finalUrl } = await getPhotoUploadUrl(
        accessToken,
        studentId,
        file.type as AllowedMime,
      );
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`R2 upload failed (${putRes.status})`);
      onUploaded(finalUrl);
    } catch (err) {
      setError((err as Error).message);
      setPreview(initialUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-semibold"
        >
          {initials || '?'}
        </div>
      )}
      <div className="space-y-1">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={uploading}
          aria-label="Photo de l'élève"
          className="block text-sm"
        />
        <p className="text-xs text-muted-foreground">JPEG / PNG / WebP — max 5 Mo</p>
        {!studentId && (
          <p className="text-xs text-amber-700">
            La photo sera téléchargée après création de l’élève.
          </p>
        )}
        {uploading && <p className="text-xs text-muted-foreground">Upload en cours…</p>}
        {error && (
          <p className="text-xs text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
