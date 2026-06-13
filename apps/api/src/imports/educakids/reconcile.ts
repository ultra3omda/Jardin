/**
 * EducaKids import — réconciliation (fonctions pures, testées en unit).
 * Dédoublonnage des parents par téléphone et rattachement des paiements aux
 * élèves par nom normalisé + classe.
 */
import { normalizeName } from './parse';

export interface StudentRow {
  student_id: string;
  name: string;
  class_label: string;
  phone?: string;
  sex?: string; // 'M' | 'F' (re-scrapé depuis EducaKids ; absent si genre non renseigné)
}

export interface PaymentRow {
  name: string;
  niveau: string;
  classe: string;
}

/** Regroupe les `student_id` par téléphone parent (dédup). */
export function dedupeParentsByPhone(students: StudentRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const s of students) {
    const phone = (s.phone ?? '').replace(/\s/g, '');
    if (!phone) continue;
    const list = map.get(phone) ?? [];
    list.push(s.student_id);
    map.set(phone, list);
  }
  return map;
}

/** Clé de nom insensible à l'ordre des tokens : « Jana Cherif » et
 *  « Cherif Jana » donnent la même clé (l'ordre nom/prénom diffère entre la
 *  roster et les exports de paiement EducaKids). */
export function nameKey(s: string): string {
  return normalizeName(s).split(' ').filter(Boolean).sort().join(' ');
}

/** Rattache un paiement à un élève par nom (ordre indifférent) + classe.
 *  Renvoie le `student_id` si match UNIQUE, sinon null (0 ou >1 candidat). */
export function matchPaymentToStudent(
  payment: PaymentRow,
  students: StudentRow[],
): string | null {
  const payName = nameKey(payment.name ?? '');
  const payClass = normalizeName(payment.classe ?? '');
  const candidates = students.filter((s) => {
    if (nameKey(s.name) !== payName) return false;
    if (!payClass) return true; // pas de classe fournie → match sur le nom seul
    const { name: className } = splitClass(s.class_label);
    return normalizeName(className) === payClass;
  });
  return candidates.length === 1 ? candidates[0].student_id : null;
}

function splitClass(label: string): { name: string } {
  const idx = label.indexOf(':');
  return { name: idx === -1 ? label : label.slice(idx + 1).trim() };
}
