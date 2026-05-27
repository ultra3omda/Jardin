'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
  enrollmentDate: string;
  deletedAt: string | null;
}

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export default function EnrollmentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setFetchError(null);
    try {
      const data = await apiFetch<{ items: Student[] }>('/api/students?limit=200', token);
      setStudents(data.items ?? []);
    } catch (e) { setFetchError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const classrooms = [...new Set(students.map((s) => s.classroom).filter(Boolean))].sort();
  const filtered = students.filter((s) => {
    const matchSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || s.classroom === filter;
    return matchSearch && matchFilter;
  });
  const active = students.filter((s) => !s.deletedAt).length;
  const archived = students.filter((s) => s.deletedAt).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Inscriptions</h1>
        <p className="text-sm text-muted-foreground">{active} élèves actifs · {archived} archivés</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Rechercher un élève…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-md border px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classrooms.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erreur : {fetchError} <button onClick={() => void load()} className="ml-2 underline">Réessayer</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Aucun élève trouvé.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Classe actuelle</th>
                <th className="px-4 py-3">Date inscription</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.lastName} {s.firstName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.classroom || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.deletedAt ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {s.deletedAt ? 'Archivé' : 'Actif'}
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