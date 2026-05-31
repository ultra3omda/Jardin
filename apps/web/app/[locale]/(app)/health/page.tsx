'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { InfirmaryVisitsSection } from '@/components/health/infirmary-visits-section';
import { VaccinationsSection } from '@/components/health/vaccinations-section';
import { HealthRecordsSection } from '@/components/health/health-records-section';

type HealthTab = 'infirmary' | 'vaccinations' | 'records';

const TABS: { key: HealthTab; label: string }[] = [
  { key: 'infirmary', label: 'Infirmerie' },
  { key: 'vaccinations', label: 'Vaccinations' },
  { key: 'records', label: 'Dossiers médicaux' },
];

export default function HealthPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<HealthTab>('infirmary');

  // RBAC (spec §4.8) : SCHOOL_ADMIN + STAFF manage, PARENT reads, TEACHER no access.
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';
  const canView = canManage || user?.role === 'PARENT';

  if (!canView) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Santé</h1>
        </header>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Accès non autorisé : les données de santé sont réservées à la direction, au personnel
          infirmier et aux parents concernés.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Données médicales — RGPD</strong> : ces informations sont confidentielles et
        accessibles uniquement au personnel habilité. Elles ne doivent pas être partagées sans
        consentement explicite.
      </div>

      <div
        role="tablist"
        aria-label="Sections santé"
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

      {tab === 'infirmary' && <InfirmaryVisitsSection canManage={canManage} />}
      {tab === 'vaccinations' && <VaccinationsSection canManage={canManage} />}
      {tab === 'records' && <HealthRecordsSection canManage={canManage} />}
    </div>
  );
}
