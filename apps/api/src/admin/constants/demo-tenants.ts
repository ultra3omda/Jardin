/**
 * Demo tenants are seeded with a `demo-` slug prefix (`demo-ecole`,
 * `demo-maternelle`, `demo-lycee-avenir`). They power the public "Comptes démo"
 * flow and MUST stay in the database, but they are NOT real customers.
 *
 * Platform figures shown to the super-admin (overview counts, analytics) must
 * exclude them so the super-admin only ever sees real establishments —
 * never the seeded demo data.
 */
export const DEMO_TENANT_SLUG_PREFIX = 'demo-';
