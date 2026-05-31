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

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_STUDENTS_ENROLL: Student[] = [
  { id: 'ds-1-1', firstName: 'Léa', lastName: 'Fontaine', classroom: 'CP-A', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-1-2', firstName: 'Adam', lastName: 'Saidi', classroom: 'CP-A', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-1-3', firstName: 'Sofia', lastName: 'Benali', classroom: 'CP-A', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-1-4', firstName: 'Hamza', lastName: 'Khlifi', classroom: 'CP-A', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-2-1', firstName: 'Ines', lastName: 'Gharbi', classroom: 'CE1-B', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-2-2', firstName: 'Mehdi', lastName: 'Ben Ali', classroom: 'CE1-B', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-2-3', firstName: 'Julie', lastName: 'Dupont', classroom: 'CE1-B', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-3-1', firstName: 'Ibrahima', lastName: 'Ba', classroom: 'CM1-A', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-3-2', firstName: 'Yasmine', lastName: 'Gharbi', classroom: 'CM1-A', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-4-1', firstName: 'Nour', lastName: 'Karoui', classroom: 'CM2-B', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-4-2', firstName: 'Pierre', lastName: 'Simon', classroom: 'CM2-B', enrollmentDate: '2024-09-02', deletedAt: null },
  { id: 'ds-4-3', firstName: 'Dina', lastName: 'Belhaj', classroom: 'CM2-B', enrollmentDate: '2024-09-02', deletedAt: null },
];

// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export default function EnrollmentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: Student[] }>('/api/students?pageSize=100', token);
      const items = data.items ?? [];
      setStudents(items);
    } catch {
      setStudents([]);
      setError(true);
    }
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