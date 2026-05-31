'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { StaffSection } from '@/components/hr/staff-section';
import { ContractsSection } from '@/components/hr/contracts-section';
import { LeavesSection } from '@/components/hr/leaves-section';

type HrTab = 'staff' | 'contracts' | 'leaves';

const TABS: { key: HrTab; label: string }[] = [
  { key: 'staff', label: 'Personnel' },
  { key: 'contracts', label: 'Contrats' },
  { key: 'leaves', label: 'Congés' },
];

export default function HrPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<HrTab>('staff');

  // RBAC (spec T2c §4.3) : la gestion RH est réservée à la direction.
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  if (!canManage) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">RH / Paie</h1>
        </header>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Accès non autorisé : la gestion RH est réservée à la direction.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">RH / Paie</h1>
        <p className="text-sm text-muted-foreground">
          Personnel, contrats de travail et congés. La paie arrive prochainement.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Sections RH"
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

      {tab === 'staff' && <StaffSection />}
      {tab === 'contracts' && <ContractsSection />}
      {tab === 'leaves' && <LeavesSection />}
    </div>
  );
}
