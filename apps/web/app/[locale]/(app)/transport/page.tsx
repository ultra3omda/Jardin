'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { RoutesSection } from '@/components/transport/routes-section';
import { AssignmentsSection } from '@/components/transport/assignments-section';

type TransportTab = 'routes' | 'assignments';

const TABS: { key: TransportTab; label: string }[] = [
  { key: 'routes', label: 'Lignes' },
  { key: 'assignments', label: 'Affectations' },
];

export default function TransportPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TransportTab>('routes');

  // RBAC (spec §4.8) : SCHOOL_ADMIN + STAFF manage, PARENT reads, TEACHER no access.
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';
  const canView = canManage || user?.role === 'PARENT';

  if (!canView) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Transport scolaire</h1>
        </header>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Accès non autorisé : la gestion du transport est réservée à la direction et au personnel.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Sections transport"
        className="flex flex-wrap gap-2 border-b border-slate-200"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-navy-700 text-navy-900'
                : 'border-transparent text-muted-foreground hover:text-navy-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'routes' && <RoutesSection canManage={canManage} />}
      {tab === 'assignments' && <AssignmentsSection canManage={canManage} />}
    </div>
  );
}
