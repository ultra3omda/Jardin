import { describe, it, expect } from 'vitest';

import { dedupeParentsByPhone, matchPaymentToStudent, StudentRow } from './reconcile';

const STUDENTS: StudentRow[] = [
  { student_id: '8', name: 'Jana Cherif', class_label: "Jardin d'enfants -4ans: 4ans-Les Tulipes", phone: '51456844' },
  { student_id: '9', name: 'Sami Ben Ali', class_label: "Jardin d'enfants -3ans: 3ans-Les poussins", phone: '51456844' },
  { student_id: '10', name: 'Lina Trabelsi', class_label: 'Préparatoire: Prépa-Le Soleil', phone: '99887766' },
];

describe('dedupeParentsByPhone', () => {
  it('regroupe les élèves par téléphone parent', () => {
    const map = dedupeParentsByPhone(STUDENTS);
    expect(map.get('51456844')).toEqual(['8', '9']);
    expect(map.get('99887766')).toEqual(['10']);
  });
  it('ignore les téléphones vides', () => {
    const map = dedupeParentsByPhone([{ student_id: 'x', name: 'No Phone', class_label: 'c', phone: '' }]);
    expect(map.size).toBe(0);
  });
});

describe('matchPaymentToStudent', () => {
  it('matche par nom normalisé + classe', () => {
    const sid = matchPaymentToStudent(
      { name: 'JANA CHERIF', niveau: "Jardin d'enfants -4ans", classe: '4ans-Les Tulipes' },
      STUDENTS,
    );
    expect(sid).toBe('8');
  });
  it('renvoie null si introuvable', () => {
    expect(matchPaymentToStudent({ name: 'Inconnu', niveau: 'x', classe: 'y' }, STUDENTS)).toBeNull();
  });
  it('renvoie null si ambigu (>1 candidat même nom/classe)', () => {
    const dup: StudentRow[] = [
      { student_id: '1', name: 'Homonyme X', class_label: 'C: A' },
      { student_id: '2', name: 'Homonyme X', class_label: 'C: A' },
    ];
    expect(matchPaymentToStudent({ name: 'Homonyme X', niveau: 'C', classe: 'A' }, dup)).toBeNull();
  });
});
