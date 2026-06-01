import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

/**
 * Parse an uploaded CSV or XLSX buffer into an array of string-keyed records,
 * keyed by the header row. Header cells are trimmed. Empty trailing rows are
 * dropped. Throws BadRequestException on malformed input or row-count overflow.
 */
export async function parseImportFile(
  buffer: Buffer,
  filename: string,
): Promise<Record<string, string>[]> {
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    throw new BadRequestException({
      code: 'FILE_TOO_LARGE',
      message: `Fichier trop volumineux (max ${MAX_IMPORT_BYTES / (1024 * 1024)} Mo).`,
    });
  }
  const isXlsx = /\.xlsx$/i.test(filename);
  const rows = isXlsx ? await parseXlsx(buffer) : parseCsv(buffer);

  if (rows.length === 0) {
    throw new BadRequestException({ code: 'EMPTY_FILE', message: 'Le fichier ne contient aucune ligne.' });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException({
      code: 'TOO_MANY_ROWS',
      message: `Trop de lignes (max ${MAX_IMPORT_ROWS}).`,
    });
  }
  return rows;
}

function parseCsv(buffer: Buffer): Record<string, string>[] {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
  } catch (e) {
    throw new BadRequestException({
      code: 'CSV_PARSE_ERROR',
      message: `CSV illisible : ${e instanceof Error ? e.message : String(e)}`,
    });
  }
  return records;
}

async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  try {
    // exceljs accepts a Node Buffer for xlsx.load despite the DOM typing.
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch (e) {
    throw new BadRequestException({
      code: 'XLSX_PARSE_ERROR',
      message: `Excel illisible : ${e instanceof Error ? e.message : String(e)}`,
    });
  }
  const sheet = wb.worksheets[0];
  if (!sheet) {
    throw new BadRequestException({ code: 'XLSX_NO_SHEET', message: 'Aucune feuille dans le classeur.' });
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim();
  });

  const out: Record<string, string>[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const record: Record<string, string> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c];
      if (!key) continue;
      const raw = row.getCell(c + 1).value;
      const val = cellToString(raw);
      if (val !== '') hasValue = true;
      record[key] = val;
    }
    if (hasValue) out.push(record);
  }
  return out;
}

/** Normalise an exceljs cell value to a trimmed string (dates → YYYY-MM-DD). */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    // Rich text / formula / hyperlink cells.
    const obj = value as { text?: string; result?: unknown; hyperlink?: string };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (obj.result !== undefined) return String(obj.result).trim();
    if (typeof obj.hyperlink === 'string') return obj.hyperlink.trim();
    return '';
  }
  return String(value).trim();
}
