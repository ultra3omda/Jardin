'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface StudentOption { id: string; firstName: string; lastName: string; classroom: string }
interface PeriodOption { id: string; name: string; schoolYear: string; isClosed: boolean }
interface BulletinInfo { id: string; pdfUrl: string | null; generatedAt: string }

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_STUDENTS_BULLETINS: StudentOption[] = [
  { id: 'ds-3-1', firstName: 'Ibrahima', lastName: 'Ba', classroom: 'CM1-A' },
  { id: 'ds-3-2', firstName: 'Yasmine', lastName: 'Gharbi', classroom: 'CM1-A' },
  { id: 'ds-3-3', firstName: 'Khalil', lastName: 'Mejri', classroom: 'CM1-A' },
  { id: 'ds-3-4', firstName: 'Fatou', lastName: 'Diallo', classroom: 'CM1-A' },
  { id: 'ds-3-5', firstName: 'Lucas', lastName: 'Bernard', classroom: 'CM1-A' },
  { id: 'ds-3-6', firstName: 'Amira', lastName: 'Mansouri', classroom: 'CM1-A' },
  { id: 'ds-4-1', firstName: 'Nour', lastName: 'Karoui', classroom: 'CM2-B' },
  { id: 'ds-4-2', firstName: 'Pierre', lastName: 'Simon', classroom: 'CM2-B' },
  { id: 'ds-4-3', firstName: 'Dina', lastName: 'Belhaj', classroom: 'CM2-B' },
  { id: 'ds-4-4', firstName: 'Hugo', lastName: 'Michel', classroom: 'CM2-B' },
];

const DEMO_PERIODS_BULLETINS: PeriodOption[] = [
  { id: 'demo-period-1', name: '1er Trimestre', schoolYear: '2025-2026', isClosed: true },
  { id: 'demo-period-2', name: '2ème Trimestre', schoolYear: '2025-2026', isClosed: false },
];

// Pre-built demo bulletins: some generated, some not yet
const DEMO_BULLETINS_MAP = new Map<string, BulletinInfo | null>([
  ['ds-3-1', { id: 'dbul-1', pdfUrl: null, generatedAt: '2026-02-15T10:00:00Z' }],
  ['ds-3-2', { id: 'dbul-2', pdfUrl: null, generatedAt: '2026-02-15T10:05:00Z' }],
  ['ds-3-3', { id: 'dbul-3', pdfUrl: null, generatedAt: '2026-02-15T10:10:00Z' }],
  ['ds-3-4', null],
  ['ds-3-5', null],
  ['ds-3-6', { id: 'dbul-6', pdfUrl: null, generatedAt: '2026-02-16T09:00:00Z' }],
  ['ds-4-1', { id: 'dbul-7', pdfUrl: null, generatedAt: '2026-02-17T11:00:00Z' }],
  ['ds-4-2', null],
  ['ds-4-3', null],
  ['ds-4-4', { id: 'dbul-10', pdfUrl: null, generatedAt: '2026-02-17T11:30:00Z' }],
]);

// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `HTTP ${res.status}`); }
  const t = await res.text();
  return t ? (JSON.parse(t) as T) : (null as T);
}

export default function BulletinsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [bulletinsMap, setBulletinsMap] = useState<Map<string, BulletinInfo | null>>(new Map());
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingBulletins, setLoadingBulletins] = useState(false);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [progressCount, setProgressCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadBase = useCallback(async () => {
    if (!token) return;
    setLoadingStudents(true);
    try {
      const [sData, pData] = await Promise.allSettled([
        apiFetch<{ items: StudentOption[] }>('/api/students?limit=200', token),
        apiFetch<{ items: PeriodOption[] }>('/api/grade-periods', token),
      ]);
      const sItems = sData.status === 'fulfilled' ? (sData.value?.items ?? []) : [];
      const pItems = pData.status === 'fulfilled' ? (pData.value?.items ?? []) : [];
      const finalStudents = sItems.length > 0 ? sItems : DEMO_STUDENTS_BULLETINS;
      const finalPeriods = pItems.length > 0 ? pItems : DEMO_PERIODS_BULLETINS;
      setStudents(finalStudents);
      setPeriods(finalPeriods);
      if (finalPeriods.length > 0) setSelectedPeriodId(finalPeriods[0].id);
      // If using demo students, pre-populate the bulletins map
      if (sItems.length === 0) setBulletinsMap(DEMO_BULLETINS_MAP);
    } catch (_) {
      setStudents(DEMO_STUDENTS_BULLETINS);
      setPeriods(DEMO_PERIODS_BULLETINS);
      setSelectedPeriodId(DEMO_PERIODS_BULLETINS[0].id);
      setBulletinsMap(DEMO_BULLETINS_MAP);
    } finally { setLoadingStudents(false); }
  }, [token]);

  useEffect(() => { void loadBase(); }, [loadBase]);

  const loadBulletins = useCallback(async () => {
    if (!token || !selectedPeriodId || students.length === 0) return;
    setLoadingBulletins(true);
    const results = await Promise.allSettled(
      students.map((s) =>
        apiFetch<BulletinInfo>(`/api/bulletins/${s.id}/${selectedPeriodId}/latest`, token)
          .then((b) => ({ studentId: s.id, bulletin: b }))
          .catch(() => ({ studentId: s.id, bulletin: null }))
      )
    );
    const map = new Map<string, BulletinInfo | null>();
    for (const r of results) {
      if (r.status === 'fulfilled') map.set(r.value.studentId, r.value.bulletin);
    }
    setBulletinsMap(map);
    setLoadingBulletins(false);
  }, [token, selectedPeriodId, students]);

  useEffect(() => { void loadBulletins(); }, [loadBulletins]);

  async function handleGenerate(studentId: string) {
    if (!token || !selectedPeriodId) return;
    setGenerating((prev) => new Set(prev).add(studentId));
    try {
      const res = await fetch('/api/bulletins/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId, gradePeriodId: selectedPeriodId }),
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/pdf')) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } else {
          const data = await res.json() as { pdfUrl?: string };
          if (data.pdfUrl) window.open(data.pdfUrl, '_blank');
        }
        void loadBulletins();
      }
    } finally {
      setGenerating((prev) => { const s = new Set(prev); s.delete(studentId); return s; });
    }
  }

  async function handleGenerateAll() {
    const missing = students.filter((s) => !bulletinsMap.get(s.id));
    setTotalCount(missing.length); setProgressCount(0);
    for (const s of missing) {
      await handleGenerate(s.id).catch(() => null);
      setProgressCount((p) => p + 1);
    }
    setTotalCount(0);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Bulletins</h1>
          <p className="text-sm text-muted-foreground">Générez et téléchargez les bulletins de notes.</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-md border px-3 py-2 text-sm" value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}>
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.schoolYear}</option>)}
          </select>
          {totalCount > 0 ? (
            <span className="flex items-center text-sm text-muted-foreground">Génération {progressCount}/{totalCount}…</span>
          ) : (
            <button onClick={() => void handleGenerateAll()} className="rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 py-2 text-sm font-medium text-white">
              Générer tous
            </button>
          )}
        </div>
      </header>

      {loadingStudents || loadingBulletins ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Aucun élève.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date génération</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const b = bulletinsMap.get(s.id);
                const isGenerating = generating.has(s.id);
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{s.lastName} {s.firstName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.classroom || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {b ? 'Généré ✓' : 'Non généré'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b ? new Date(b.generatedAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {b?.pdfUrl && <a href={b.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Télécharger PDF</a>}
                        <button disabled={isGenerating} onClick={() => void handleGenerate(s.id)} className="text-xs text-ambre-600 hover:underline disabled:opacity-50">
                          {isGenerating ? 'Génération…' : 'Générer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}