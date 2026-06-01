import ExcelJS from 'exceljs';

import type { ImportColumn } from './import-types';

/**
 * Build a downloadable .xlsx template: a header row (bold), 1–2 example rows,
 * and a second "Aide" sheet documenting each column (required + hint).
 */
export async function buildXlsxTemplate(
  label: string,
  columns: ImportColumn[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Klasso';
  const sheet = wb.addWorksheet(label.slice(0, 28) || 'Import');

  sheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.max(14, c.label.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFE7DD' },
  };

  // Two example rows from the column examples.
  const example: Record<string, string> = {};
  for (const c of columns) example[c.key] = c.example;
  sheet.addRow(example);

  // Help sheet.
  const help = wb.addWorksheet('Aide');
  help.columns = [
    { header: 'Colonne', key: 'label', width: 24 },
    { header: 'Obligatoire', key: 'required', width: 14 },
    { header: 'Format / valeurs', key: 'hint', width: 50 },
  ];
  help.getRow(1).font = { bold: true };
  for (const c of columns) {
    help.addRow({ label: c.label, required: c.required ? 'Oui' : 'Non', hint: c.hint ?? '' });
  }

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}

/** Build a downloadable .csv template: header + one example row. */
export function buildCsvTemplate(columns: ImportColumn[]): string {
  const esc = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = columns.map((c) => esc(c.label)).join(',');
  const example = columns.map((c) => esc(c.example)).join(',');
  return `${header}\n${example}\n`;
}
