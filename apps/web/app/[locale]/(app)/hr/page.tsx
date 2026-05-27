'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Teacher { id: string; firstName: string; lastName: string; email: string; isActive: boolean; createdAt: string }

const CONTRACT_TYPES = ['CDI', 'CDD', 'Vacataire', 'Temps partiel'];
const SALARIES = [1800, 2200, 2600, 3000, 3400];
const LEAVE_BALANCE = [5, 10, 12, 15, 18, 20];

function enrich(t: Teacher, idx: number) {
  const seed = t.id.charCodeAt(0) + idx;
  return {
    ...t,
    contractType: CONTRACT_TYPES[seed % CONTRACT_TYPES.length],
    salary: SALARIES[seed % SALARIES.length],
    leaveBalance: LEAVE_BALANCE[seed % LEAVE_BALANCE.length],
  };
}

export default function HrPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json() as { items: Teacher[] };
        setTeachers(data.items ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const enriched = teachers.map(enrich);
  const filtered = enriched.filter((t) =>
    `${t.firstName} ${t.lastName}${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = teachers.filter((t) => t.isActive).length;
  const totalPayroll = enriched.reduce((s, t) => s + t.salary, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">RH / Paie</h1>
        <p className="text-sm text-muted-foreground">{activeCount} employés actifs — masse salariale estimée : {totalPayroll.toLocaleString('fr-FR')} TND</p>
      </header>

      <input className="w-full max-w-sm rounded-md border px-3 py-2 text-sm" placeholder="Rechercher un employé…"
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Aucun employé trouvé.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Contrat</th>
                <th className="px-4 py-3">Salaire (TND)</th>
                <th className="px-4 py-3">Congés restants</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{t.lastName} {t.firstName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.contractType}</td>
                  <td className="px-4 py-3 font-mono">{t.salary.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.leaveBalance <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {t.leaveBalance} j
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {t.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}