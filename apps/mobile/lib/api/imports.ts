import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchApi } from './client';
import { useAuthStore } from '@/lib/auth/store';

/**
 * Imports CSV/Excel (SCHOOL_ADMIN / STAFF). Web-only pour l'upload (multipart),
 * sur le même pattern que les pièces jointes devoirs / le logo : le natif
 * (sélecteur de fichier) viendra avec expo-document-picker (lot deps).
 * Miroir de apps/api/src/imports/imports.controller.ts.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ImportEntity {
  id: string;
  label: string;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  entity: string;
  total: number;
  valid: number;
  imported: number;
  dryRun: boolean;
  errors: ImportRowError[];
}

export const IMPORT_ENTITIES_KEY = ['imports', 'entities'] as const;

export function useImportEntities() {
  return useQuery({
    queryKey: IMPORT_ENTITIES_KEY,
    queryFn: () => fetchApi<ImportEntity[]>('/api/imports/entities'),
  });
}

/** True quand l'upload de fichier est possible (web export). */
export const canUploadImports = Platform.OS === 'web';

/** Web-only : ouvre un sélecteur de fichier .csv/.xlsx et renvoie le File. */
export function pickImportFile(): Promise<File | null> {
  if (Platform.OS !== 'web') return Promise.resolve(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = (globalThis as any).document;
  if (!doc) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept =
      '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.onchange = () => resolve((input.files?.[0] as File | undefined) ?? null);
    input.click();
  });
}

/**
 * Upload multipart d'un fichier vers /api/imports/:entity. dryRun=true →
 * validation seule (aucune écriture). On envoie le token manuellement car
 * c'est du multipart (le client JSON ne convient pas).
 */
export async function runImport(
  entityId: string,
  file: File,
  dryRun: boolean,
): Promise<ImportResult> {
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(
    `${API_BASE}/api/imports/${encodeURIComponent(entityId)}?dryRun=${dryRun ? 'true' : 'false'}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }
  return (await res.json()) as ImportResult;
}
