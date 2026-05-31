'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { MenusSection } from '@/components/canteen/menus-section';
import { MealPlansSection } from '@/components/canteen/meal-plans-section';

type CanteenTab = 'menus' | 'plans';

const TABS: { key: CanteenTab; label: string }[] = [
  { key: 'menus', label: 'Menus' },
  { key: 'plans', label: 'Régimes' },
];

export default function CanteenPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<CanteenTab>('menus');

  // RBAC (spec §4.8) : SCHOOL_ADMIN + STAFF manage, PARENT reads, TEACHER no access.
  const canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF';
  const canView = canManage || user?.role === 'PARENT';

  if (!canView) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Cantine</h1>
        </header>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Accès non autorisé : la gestion de la cantine est réservée à la direction et au
          personnel.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Sections cantine"
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

      {tab === 'menus' && <MenusSection canManage={canManage} />}
      {tab === 'plans' && <MealPlansSection canManage={canManage} />}
    </div>
  );
}
