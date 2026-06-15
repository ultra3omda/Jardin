/** Échappe une valeur CSV (RFC 4180) : entoure de guillemets si elle contient , " ou un retour ligne. */
function escapeCsv(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Construit une chaîne CSV (en-tête + lignes). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(','));
  return [head, ...body].join('\n');
}

/** Déclenche le téléchargement d'un CSV (BOM UTF-8 pour Excel). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
