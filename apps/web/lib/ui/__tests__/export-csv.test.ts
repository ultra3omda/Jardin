import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/ui/export-csv';

interface Row { a: string; b: number; }
const cols = [
  { header: 'A', value: (r: Row) => r.a },
  { header: 'B', value: (r: Row) => r.b },
];

describe('toCsv', () => {
  it('produit en-tête + lignes', () => {
    expect(toCsv([{ a: 'x', b: 1 }], cols)).toBe('A,B\nx,1');
  });
  it('échappe virgules, guillemets et retours ligne', () => {
    const out = toCsv([{ a: 'a,b', b: 2 }, { a: 'he said "hi"', b: 3 }], cols);
    expect(out).toBe('A,B\n"a,b",2\n"he said ""hi""",3');
  });
});
