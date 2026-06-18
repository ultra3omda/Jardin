export type DomainStatus = 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'NONE';

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  PROVISIONING: 'Domaine en cours…',
  ACTIVE: 'Domaine actif',
  FAILED: 'Échec domaine',
  NONE: '—',
};

export const DOMAIN_STATUS_TONE: Record<DomainStatus, string> = {
  PROVISIONING: 'bg-amber-100 text-amber-800 border-amber-300',
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  FAILED: 'bg-red-100 text-red-800 border-red-300',
  NONE: 'bg-slate-100 text-slate-600 border-slate-300',
};

/** Pastille de statut de domaine personnalisé — libellé FR + ton, partagé liste/détail. */
export function DomainStatusBadge({ status }: { status: DomainStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${DOMAIN_STATUS_TONE[status]}`}
    >
      {DOMAIN_STATUS_LABELS[status]}
    </span>
  );
}
