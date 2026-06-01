'use client';

import { apiGet } from './http';

const BASE = '/api/imports';

export interface ImportEntity {
  id: string;
  label: string;
}

export interface ImportResult {
  entity: string;
  total: number;
  valid: number;
  imported: number;
  dryRun: boolean;
  errors: { row: number; message: string }[];
}

export const listImportEntities = (token: string) =>
  apiGet<ImportEntity[]>(`${BASE}/entities`, token);

/** Trigger a browser download of an entity's template (.xlsx or .csv). */
export async function downloadImportTemplate(
  token: string,
  entityId: string,
  format: 'xlsx' | 'csv',
): Promise<void> {
  const res = await fetch(`${BASE}/${entityId}/template?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Téléchargement impossible (HTTP ${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${entityId}-template.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function runImport(
  token: string,
  entityId: string,
  file: File,
  dryRun: boolean,
): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/${entityId}?dryRun=${dryRun}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as ImportResult & { message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? `Import impossible (HTTP ${res.status})`);
  }
  return body;
}
