'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';

interface StudentOption { id: string; firstName: string; lastName: string; classroom: string }
interface PeriodOption { id: string; name: string; schoolYear: string; isClosed: boolean }
interface BulletinInfo { id: string; pdfUrl: string | null; generatedAt: string }
interface MyChild { id: string; firstName: string; lastName: string; className: string | null }

type LoadState = 'loading' | 'error' | 'ready';

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `HTTP ${res.status}`);
  }
  const t = await res.text();
  return t ? (JSON.parse(t) as T) : (null as T);
}

export default function BulletinsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const isParent = useAuthStore((s) => s.user?.role) === 'PARENT';
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [bulletinsMap, setBulletinsMap] = useState<Map<string, BulletinInfo | null>>(new Map());
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadingBulletins, setLoadingBulletins] = useState(false);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [progressCount, setProgressCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBase = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      const studentsReq = isParent
        ? apiFetch<MyChild[]>('/api/students/my-children', token).then((rows) => ({
            items: (rows ?? []).map((c) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              classroom: c.className ?? '',
            })),
          }))
        : apiFetch<{ items: StudentOption[] }>('/api/students?limit=200', token);
      const [sData, pData] = await Promise.all([
        studentsReq,
        apiFetch<{ items: PeriodOption[] }>('/api/grade-periods', token),
      ]);
      const sItems = sData?.items ?? [];
      const pItems = pData?.items ?? [];
      setStudents(sItems);
      setPeriods(pItems);
      if (pItems.length > 0) setSelectedPeriodId(pItems[pItems.length - 1].id);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [token, isParent]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const loadBulletins = useCallback(async () => {
    if (!token || !selectedPeriodId || students.length === 0) return;
    setLoadingBulletins(true);
    const results = await Promise.allSettled(
      students.map((s) =>
        apiFetch<BulletinInfo>(`/api/bulletins/${s.id}/${selectedPeriodId}/latest`, token)
          .then((b) => ({ studentId: s.id, bulletin: b }))
          .catch(() => ({ studentId: s.id, bulletin: null })),
      ),
    );
    const map = new Map<string, BulletinInfo | null>();
    for (const r of results) {
      if (r.status === 'fulfilled') map.set(r.value.studentId, r.value.bulletin);
    }
    setBulletinsMap(map);
    setLoadingBulletins(false);
  }, [token, selectedPeriodId, students]);

  useEffect(() => {
    void loadBulletins();
  }, [loadBulletins]);

  function clearGenerating(studentId: string) {
    setGenerating((prev) => {
      const s = new Set(prev);
      s.delete(studentId);
      return s;
    });
  }

  async function handleDownload(studentId: string) {
    if (!token || !selectedPeriodId) return;
    setErrorMsg(null);
    setGenerating((prev) => new Set(prev).add(studentId));
    try {
      const res = await fetch(`/api/bulletins/${studentId}/${selectedPeriodId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      setErrorMsg('Le téléchargement du bulletin a échoué. Réessayez.');
    } finally {
      clearGenerating(studentId);
    }
  }

  async function handleGenerate(studentId: string) {
    if (!token || !selectedPeriodId) return;
    setErrorMsg(null);
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
          window.open(URL.createObjectURL(blob), '_blank');
        } else {
          const data = (await res.json()) as { pdfUrl?: string };
          if (data.pdfUrl) window.open(data.pdfUrl, '_blank');
        }
        void loadBulletins();
      } else {
        setErrorMsg('La génération du bulletin a échoué. Réessayez.');
      }
    } catch {
      setErrorMsg('La génération du bulletin a échoué. Réessayez.');
    } finally {
      clearGenerating(studentId);
    }
  }

  async function handleGenerateAll() {
    const missing = students.filter((s) => !bulletinsMap.get(s.id));
    setTotalCount(missing.length);
    setProgressCount(0);
    for (const s of missing) {
      await handleGenerate(s.id).catch(() => null);
      setProgressCount((p) => p + 1);
    }
    setTotalCount(0);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulletins"
        description={
          isParent ? 'Téléchargez les bulletins de vos enfants.' : 'Générez et téléchargez les bulletins de notes.'
        }
        actions={
          <div className="flex gap-2">
            <label htmlFor="bulletin-period" className="sr-only">
              Période
            </label>
            <select
              id="bulletin-period"
              className="rounded-md border px-3 py-2 text-sm"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.schoolYear}
                </option>
              ))}
            </select>
            {!isParent &&
              (totalCount > 0 ? (
                <span className="flex items-center text-sm text-muted-foreground">
                  Génération {progressCount}/{totalCount}…
                </span>
              ) : (
                <button
                  onClick={() => void handleGenerateAll()}
                  className="rounded-md bg-ambre-500 px-4 py-2 text-sm font-medium text-white hover:bg-ambre-600"
                >
                  Générer tous
                </button>
              ))}
          </div>
        }
      />

      {errorMsg && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {errorMsg}
        </div>
      )}

      {loadState === 'loading' || loadingBulletins ? (
        <TableSkeleton rows={5} cols={5} />
      ) : loadState === 'error' ? (
        <ErrorRetry message="Impossible de charger les bulletins." onRetry={() => void loadBase()} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" aria-hidden="true" />}
          title="Aucun élève"
          description={isParent ? 'Aucun enfant rattaché à votre compte.' : 'Aucun élève à afficher.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
                    <td className="px-4 py-3 font-medium">
                      {s.lastName} {s.firstName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.classroom || '—'}</td>
                    <td className="px-4 py-3">
                      {isParent ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Disponible
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {b ? 'Généré ✓' : 'Non généré'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b ? new Date(b.generatedAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {isParent ? (
                          <button
                            disabled={isGenerating}
                            onClick={() => void handleDownload(s.id)}
                            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {isGenerating ? 'Préparation…' : 'Télécharger le bulletin'}
                          </button>
                        ) : (
                          <>
                            {b?.pdfUrl && (
                              <a
                                href={b.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Télécharger PDF
                              </a>
                            )}
                            <button
                              disabled={isGenerating}
                              onClick={() => void handleGenerate(s.id)}
                              className="text-xs text-ambre-600 hover:underline disabled:opacity-50"
                            >
                              {isGenerating ? 'Génération…' : 'Générer'}
                            </button>
                          </>
                        )}
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
