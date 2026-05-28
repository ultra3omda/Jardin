'use client';

import { Building2, Users, TrendingUp, Bell } from 'lucide-react';

const PLATFORM_STATS = [
  { label: 'Établissements actifs', value: '17', sub: '+2 ce mois', icon: Building2, color: 'bg-purple-50 text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  { label: 'Utilisateurs totaux', value: '1 247', sub: '+48 cette semaine', icon: Users, color: 'bg-blue-50 text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  { label: 'MRR', value: '4 980 TND', sub: '+12% vs mois préc.', icon: TrendingUp, color: 'bg-green-50 text-green-600', badge: 'bg-green-100 text-green-700' },
  { label: 'Démos en attente', value: '3', sub: 'À traiter', icon: Bell, color: 'bg-orange-50 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
];

const TENANTS = [
  { name: 'École El Khadra — Tunis', type: 'Primaire', users: 87, status: 'Actif', plan: 'Pro', mrr: '290 TND', since: 'Sept. 2024' },
  { name: 'Maternelle Les Étoiles — Sousse', type: 'Maternelle', users: 34, status: 'Actif', plan: 'Starter', mrr: '150 TND', since: 'Oct. 2024' },
  { name: 'École Carthage International', type: 'Primaire', users: 142, status: 'Actif', plan: 'Enterprise', mrr: '490 TND', since: 'Janv. 2024' },
  { name: 'Groupe scolaire Ibn Sina', type: 'Mixte', users: 215, status: 'Actif', plan: 'Enterprise', mrr: '690 TND', since: 'Janv. 2024' },
  { name: 'École Privée Les Jasmins', type: 'Primaire', users: 76, status: 'Suspendu', plan: 'Pro', mrr: '0 TND', since: 'Mars 2025' },
];

const STATUS_COLORS: Record<string, string> = {
  'Actif': 'bg-green-100 text-green-700',
  'Suspendu': 'bg-red-100 text-red-700',
  'Essai': 'bg-yellow-100 text-yellow-700',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Vue plateforme</h1>
        <p className="text-sm text-muted-foreground">Tableau de bord Klasso — tous les établissements.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORM_STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.badge}`}>{s.sub}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-navy-900">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-navy-900">Établissements</h2>
          <a href="/admin/tenants" className="text-xs text-ambre-600 hover:underline">Voir tous →</a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
              <th className="px-4 py-3">Établissement</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Utilisateurs</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">MRR</th>
              <th className="px-4 py-3">Depuis</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {TENANTS.map((t) => (
              <tr key={t.name} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-navy-900">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.type}</td>
                <td className="px-4 py-3">{t.users}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{t.plan}</span>
                </td>
                <td className="px-4 py-3 font-mono text-sm">{t.mrr}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.since}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
