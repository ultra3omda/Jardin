'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, Building2, CreditCard, BarChart3 } from 'lucide-react';

const MONTHLY_METRICS = [
  { month: 'Oct.', tenants: 12, users: 890, mrr: 3200 },
  { month: 'Nov.', tenants: 13, users: 950, mrr: 3550 },
  { month: 'Déc.', tenants: 13, users: 1010, mrr: 3550 },
  { month: 'Jan.', tenants: 14, users: 1080, mrr: 3840 },
  { month: 'Fév.', tenants: 15, users: 1150, mrr: 4130 },
  { month: 'Mars', tenants: 17, users: 1247, mrr: 4980 },
];

const KPIS = [
  { label: 'MRR actuel', value: '4 980 TND', delta: '+20.4%', trend: 'up', icon: CreditCard, color: 'text-green-600' },
  { label: 'ARR projeté', value: '59 760 TND', delta: '+20.4%', trend: 'up', icon: TrendingUp, color: 'text-green-600' },
  { label: 'Écoles actives', value: '17', delta: '+2 ce mois', trend: 'up', icon: Building2, color: 'text-blue-600' },
  { label: 'Utilisateurs', value: '1 247', delta: '+48 cette sem.', trend: 'up', icon: Users, color: 'text-purple-600' },
  { label: 'Churn rate', value: '2.1%', delta: '-0.3%', trend: 'down-good', icon: TrendingDown, color: 'text-green-600' },
  { label: 'ARPU', value: '293 TND', delta: '+8.7%', trend: 'up', icon: BarChart3, color: 'text-amber-600' },
];

const PLAN_DIST = [
  { plan: 'Starter', count: 6, pct: 35, color: 'bg-slate-400' },
  { plan: 'Pro', count: 7, pct: 41, color: 'bg-blue-400' },
  { plan: 'Enterprise', count: 4, pct: 24, color: 'bg-purple-500' },
];

const maxMrr = Math.max(...MONTHLY_METRICS.map((m) => m.mrr));

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Analytics Plateforme</h1>
        <p className="text-sm text-muted-foreground">Métriques et croissance de Klasso.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</span>
                <Icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-2xl font-bold text-navy-900">{k.value}</p>
              <p className={`mt-1 text-xs font-medium ${k.trend === 'up' || k.trend === 'down-good' ? 'text-green-600' : 'text-red-600'}`}>{k.delta} vs mois préc.</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-navy-900">Évolution MRR (6 mois)</h2>
          <div className="flex items-end gap-2 h-32">
            {MONTHLY_METRICS.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-mono">{(m.mrr / 1000).toFixed(1)}k</span>
                <div
                  className="w-full rounded-t-md bg-ambre-400 transition-all"
                  style={{ height: `${(m.mrr / maxMrr) * 96}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-navy-900">Distribution par plan</h2>
          <div className="space-y-3">
            {PLAN_DIST.map((p) => (
              <div key={p.plan}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-navy-900">{p.plan}</span>
                  <span className="text-muted-foreground">{p.count} écoles</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${p.color} transition-all`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {MONTHLY_METRICS.slice(-1).map((m) => (
              <React.Fragment key={m.month}>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-lg font-bold text-navy-900">{m.tenants}</p>
                  <p className="text-xs text-muted-foreground">Écoles</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-lg font-bold text-navy-900">{m.users.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-muted-foreground">Utilisateurs</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-lg font-bold text-navy-900">{(m.mrr / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">MRR (TND)</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
