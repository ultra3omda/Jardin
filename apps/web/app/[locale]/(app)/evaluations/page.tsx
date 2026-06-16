'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';

interface Evaluation { id: string; title: string; date: string; maxScore: number; classId: string; subjectId: string; gradePeriodId: string }
interface ClassOption { id: string; name: string }
interface SubjectOption { id: string; name: string; emoji: string | null }
interface PeriodOption { id: string; name: string; schoolYear: string }

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `HTTP ${res.status}`); }
  const t = await res.text();
  return t ? (JSON.parse(t) as T) : (null as T);
}

export default function EvaluationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Evaluation | null>(null);
  const [form, setForm] = useState({ title: '', date: '', maxScore: 20, classId: '', subjectId: '', gradePeriodId: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    const [evRes, clRes, subRes, perRes] = await Promise.allSettled([
      apiFetch<{ items: Evaluation[] }>('/api/evaluations', token),
      apiFetch<{ items: ClassOption[] }>('/api/classes', token),
      apiFetch<{ items: SubjectOption[] }>('/api/subjects', token),
      apiFetch<{ items: PeriodOption[] }>('/api/grade-periods', token),
    ]);
    // The evaluations list is the primary data — its failure is a load error.
    if (evRes.status === 'rejected') {
      setLoadState('error');
      return;
    }
    setEvaluations(evRes.value?.items ?? []);
    setClasses(clRes.status === 'fulfilled' ? clRes.value?.items ?? [] : []);
    setSubjects(subRes.status === 'fulfilled' ? subRes.value?.items ?? [] : []);
    setPeriods(perRes.status === 'fulfilled' ? perRes.value?.items ?? [] : []);
    setLoadState('ready');
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const filtered = evaluations.filter((ev) =>
    (!filterClass || ev.classId === filterClass) &&
    (!filterSubject || ev.subjectId === filterSubject) &&
    (!filterPeriod || ev.gradePeriodId === filterPeriod)
  );

  function openCreate() {
    setEditTarget(null);
    setForm({ title: '', date: '', maxScore: 20, classId: classes[0]?.id ?? '', subjectId: subjects[0]?.id ?? '', gradePeriodId: periods[0]?.id ?? '' });
    setFormError(null); setModalOpen(true);
  }
  function openEdit(ev: Evaluation) {
    setEditTarget(ev);
    setForm({ title: ev.title, date: ev.date.slice(0, 10), maxScore: ev.maxScore, classId: ev.classId, subjectId: ev.subjectId, gradePeriodId: ev.gradePeriodId });
    setFormError(null); setModalOpen(true);
  }
  async function handleDelete(id: string) {
    if (!token || !confirm('Supprimer cette évaluation ?')) return;
    try {
      await apiFetch(`/api/evaluations/${id}`, token, { method: 'DELETE' });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Suppression impossible.');
    }
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true); setFormError(null);
    try {
      if (editTarget) {
        await apiFetch(`/api/evaluations/${editTarget.id}`, token, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiFetch('/api/evaluations', token, { method: 'POST', body: JSON.stringify(form) });
      }
      setModalOpen(false); void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally { setSubmitting(false); }
  }

  const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, `${s.emoji ?? ''} ${s.name}`.trim()]));
  const periodMap = Object.fromEntries(periods.map((p) => [p.id, `${p.name} ${p.schoolYear}`]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Évaluations"
        description="Planifiez et gérez les évaluations."
        actions={
          <button onClick={openCreate} className="inline-flex h-10 items-center rounded-md bg-ambre-500 px-4 text-sm font-medium text-white hover:bg-ambre-600">
            + Nouvelle évaluation
          </button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <select className="rounded-md border px-3 py-2 text-sm" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="rounded-md border px-3 py-2 text-sm" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="">Toutes les périodes</option>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name} {p.schoolYear}</option>)}
        </select>
        <select className="rounded-md border px-3 py-2 text-sm" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
          <option value="">Toutes les matières</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
        </select>
      </div>

      {loadState === 'loading' ? (
        <TableSkeleton rows={5} cols={7} />
      ) : loadState === 'error' ? (
        <ErrorRetry message="Impossible de charger les évaluations." onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" aria-hidden="true" />}
          title="Aucune évaluation"
          description="Créez une évaluation pour commencer la saisie des notes."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Matière</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Barème</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{ev.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{classMap[ev.classId] ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{subjectMap[ev.subjectId] ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{periodMap[ev.gradePeriodId] ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(ev.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">{ev.maxScore}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(ev)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                      <Link href={`/classes/${ev.classId}/grades` as never} className="text-xs text-green-600 hover:underline">Notes</Link>
                      <button onClick={() => void handleDelete(ev.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{editTarget ? 'Modifier' : 'Nouvelle évaluation'}</h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
              <div><label className="mb-1 block text-sm font-medium">Titre</label>
                <input className="w-full rounded-md border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required /></div>
              <div><label className="mb-1 block text-sm font-medium">Date</label>
                <input type="date" className="w-full rounded-md border px-3 py-2 text-sm" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required /></div>
              <div><label className="mb-1 block text-sm font-medium">Barème</label>
                <input type="number" min="1" max="100" className="w-full rounded-md border px-3 py-2 text-sm" value={form.maxScore} onChange={(e) => setForm((p) => ({ ...p, maxScore: Number(e.target.value) }))} required /></div>
              <div><label className="mb-1 block text-sm font-medium">Classe</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.classId} onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))} required>
                  <option value="">— Choisir —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium">Matière</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.subjectId} onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))} required>
                  <option value="">— Choisir —</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium">Période</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.gradePeriodId} onChange={(e) => setForm((p) => ({ ...p, gradePeriodId: e.target.value }))} required>
                  <option value="">— Choisir —</option>
                  {periods.map((p) => <option key={p.id} value={p.id}>{p.name} {p.schoolYear}</option>)}</select></div>
              {formError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border px-4 py-2 text-sm">Annuler</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
