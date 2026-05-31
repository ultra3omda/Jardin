'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { IncidentsSection } from '@/components/security/incidents-section';
import { VisitorsSection } from '@/components/security/visitors-section';
import { DrillsSection } from '@/components/security/drills-section';

type SecurityTab = 'incidents' | 'visitors' | 'drills';

const TABS: { key: SecurityTab; label: string }[] = [
  { key: 'incidents', label: 'Incidents' },
  { key: 'visitors', label: 'Visiteurs' },
  { key: 'drills', label: 'Exercices' },
];

export default function SecurityPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<SecurityTab>('incidents');

  // RBAC (spec §4.8) : Sécurité = SCHOOL_ADMIN + STAFF uniquement.
  const canView = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';

  if (!canView) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Sécurité</h1>
        </header>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Accès non autorisé : la sécurité est réservée à la direction et au personnel habilité.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Sections sécurité"
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

      {tab === 'incidents' && <IncidentsSection />}
      {tab === 'visitors' && <VisitorsSection />}
      {tab === 'drills' && <DrillsSection />}
    </div>
  );
}
