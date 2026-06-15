import { MANAGE_ENTRIES, DOMAIN_ORDER, groupByDomain } from '@/lib/manage-hub';

describe('manage-hub grouping', () => {
  it('contient les 18 entrées avec un domaine valide chacune', () => {
    expect(MANAGE_ENTRIES).toHaveLength(18);
    for (const e of MANAGE_ENTRIES) {
      expect(DOMAIN_ORDER).toContain(e.domain);
    }
  });
  it("groupByDomain rend des sections dans l'ordre des domaines, sans groupe vide", () => {
    const groups = groupByDomain(MANAGE_ENTRIES);
    const ids = groups.map((g) => g.domain);
    expect(ids).toEqual(DOMAIN_ORDER.filter((d) => MANAGE_ENTRIES.some((e) => e.domain === d)));
    for (const g of groups) expect(g.entries.length).toBeGreaterThan(0);
  });
  it("place Finances/Caisse/Impayés dans le domaine finance", () => {
    const fin = groupByDomain(MANAGE_ENTRIES).find((g) => g.domain === 'finance')!;
    expect(fin.entries.map((e) => e.route)).toEqual(
      expect.arrayContaining(['/(app)/manage/finance', '/(app)/manage/caisse', '/(app)/manage/unpaid']),
    );
  });
});
