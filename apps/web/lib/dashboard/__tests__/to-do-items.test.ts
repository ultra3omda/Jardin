import { describe, it, expect } from 'vitest';
import { buildToDoItems } from '@/lib/dashboard/to-do-items';

const data = { pendingPayments: 2, amountDue: 1250, todayAttendance: { absent: 3, late: 1 } };

describe('buildToDoItems', () => {
  it('retourne [] sans data', () => {
    expect(buildToDoItems('PARENT', undefined)).toEqual([]);
  });

  it('PARENT : une facture à régler vers /payments', () => {
    const items = buildToDoItems('PARENT', data);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'unpaid',
      label: 'factures à régler',
      href: '/payments',
      cta: 'Régler',
      tone: 'danger',
    });
  });

  it('PARENT singulier quand 1 facture', () => {
    expect(buildToDoItems('PARENT', { ...data, pendingPayments: 1 })[0]).toMatchObject({
      label: 'facture à régler',
    });
  });

  it('SCHOOL_ADMIN : impayés (/frais/impayes) + absences du jour', () => {
    const items = buildToDoItems('SCHOOL_ADMIN', data);
    expect(items.map((i) => i.id)).toEqual(['unpaid', 'absences']);
    expect(items[0]).toMatchObject({ href: '/frais/impayes', cta: 'Voir', label: 'paiements en retard' });
    expect(items[1]).toMatchObject({ id: 'absences', value: '4', href: '/absences' });
  });

  it('autres rôles : aucun item', () => {
    expect(buildToDoItems('TEACHER', data)).toEqual([]);
  });

  it('PARENT sans impayé : aucun item (panneau vide positif)', () => {
    expect(buildToDoItems('PARENT', { ...data, pendingPayments: 0 })).toEqual([]);
  });
});
