'use client';

import { useState, useCallback, useEffect } from 'react';
import { Pencil, Trash2, Plus, Lock } from 'lucide-react';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useRouter } from '@/i18n/routing';
import {
  GradePeriodModal,
  type GradePeriodFormValues,
} from './_components/grade-period-modal';

type GradePeriodStatus = 'OPEN' | 'CLOSED';

interface GradePeriod {
  id: string;
  name: string;
  startDate: string; // ISO date string from API
  endDate: string;   // ISO date string from API
  status: GradePeriodStatus;
}

/** Shape returned by the NestJS API (GradePeriodResponseDto). */
interface ApiGradePeriod {
  id: string;
  name: string;
  schoolYear: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

function fromApi(p: ApiGradePeriod): GradePeriod {
  return {
    id: p.id,
    name: p.name,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.isClosed ? 'CLOSED' : 'OPEN',
  };
}

async function apiFetch<T>(
  path: string,
  token: string,
  opts?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
}

/** ISO date string → YYYY-MM-DD for <input type="date"> */
function toInputDate(iso: string) {
  return iso ? iso.slice(0, 10) : '';
}

function StatusBadge({ status }: { status: GradePeriodStatus }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        Ouvert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Clôturé
    </span>
  );
}

/**
 * V7-E — Settings › Trimestres / Périodes de notation.
 * Manage grade periods: create, edit dates/name, close, delete.
 * Restricted to SCHOOL_ADMIN / SUPER_ADMIN.
 */
export default function GradePeriodsSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [periods, setPeriods] = useState<GradePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GradePeriod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradePeriod | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<GradePeriod | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Role guard
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard' as Route);
    }
  }, [user, router]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: ApiGradePeriod[]; total: number }>(
        '/api/grade-periods',
        accessToken,
      );
      setPeriods((data.items ?? []).map(fromApi));
    } catch {
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return null;
  if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'SUPER_ADMIN') return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(period: GradePeriod) {
    setEditTarget(period);
    setModalOpen(true);
  }

  async function handleModalSubmit(values: GradePeriodFormValues) {
    if (!accessToken) throw new Error('Session expirée.');
    if (editTarget) {
      const updated = await apiFetch<ApiGradePeriod>(
        `/api/grade-periods/${editTarget.id}`,
        accessToken,
        { method: 'PATCH', body: JSON.stringify(values) },
      );
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? fromApi(updated) : p)));
    } else {
      const created = await apiFetch<ApiGradePeriod>('/api/grade-periods', accessToken, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setPeriods((prev) => [...prev, fromApi(created)]);
    }
  }

  async function confirmClose() {
    if (!closeTarget || !accessToken) return;
    setCloseError(null);
    try {
      const updated = await apiFetch<ApiGradePeriod>(
        `/api/grade-periods/${closeTarget.id}/close`,
        accessToken,
        { method: 'POST', body: '{}' },
      );
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? fromApi(updated) : p)));
      setCloseTarget(null);
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'Clôture échouée.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !accessToken) return;
    setDeleteError(null);
    try {
      await apiFetch<null>(
        `/api/grade-periods/${deleteTarget.id}`,
        accessToken,
        { method: 'DELETE' },
      );
      setPeriods((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Suppression échouée.');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Trimestres / Périodes de notation
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez les périodes d&apos;évaluation de l&apos;année scolaire.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-ambre-500 hover:bg-ambre-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nouveau trimestre
        </Button>
      </header>

      {/* Loading */}
      {loading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {/* Empty state */}
      {!loading && periods.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucune période configurée. Ajoutez votre premier trimestre.
        </div>
      )}

      {/* Periods table */}
      {!loading && periods.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table
            className="w-full text-sm"
            aria-label="Liste des périodes de notation"
          >
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3 w-36">Date début</th>
                <th className="px-4 py-3 w-36">Date fin</th>
                <th className="px-4 py-3 w-28">Statut</th>
                <th className="px-4 py-3 w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period, idx) => (
                <tr
                  key={period.id}
                  className={`border-b last:border-0 transition-colors hover:bg-slate-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {period.name}
                  </td>
                  <td className="px-4 py-3 text-navy-700">
                    {formatDate(period.startDate)}
                  </td>
                  <td className="px-4 py-3 text-navy-700">
                    {formatDate(period.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={period.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {period.status === 'OPEN' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Clôturer ${period.name}`}
                          onClick={() => {
                            setCloseError(null);
                            setCloseTarget(period);
                          }}
                          className="h-8 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                        >
                          <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                          Clôturer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier ${period.name}`}
                        onClick={() => openEdit(period)}
                        className="h-8 w-8 text-navy-600 hover:text-navy-900"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${period.name}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(period);
                        }}
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <GradePeriodModal
        open={modalOpen}
        initial={
          editTarget
            ? {
                name: editTarget.name,
                startDate: toInputDate(editTarget.startDate),
                endDate: toInputDate(editTarget.endDate),
              }
            : undefined
        }
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      {/* Close confirmation dialog */}
      {closeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmer la clôture"
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-center rounded-t-xl bg-navy-900 px-6 py-4">
              <h2 className="text-base font-semibold text-white">
                Clôturer la période
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-navy-700">
                Êtes-vous sûr de vouloir clôturer{' '}
                <span className="font-semibold">{closeTarget.name}</span> ?
                Les notes ne pourront plus être modifiées.
              </p>
              {closeError && (
                <p className="text-sm text-destructive">{closeError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCloseTarget(null)}>
                  Annuler
                </Button>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => void confirmClose()}
                >
                  Clôturer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmer la suppression"
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-center rounded-t-xl bg-navy-900 px-6 py-4">
              <h2 className="text-base font-semibold text-white">
                Supprimer la période
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-navy-700">
                Êtes-vous sûr de vouloir supprimer{' '}
                <span className="font-semibold">{deleteTarget.name}</span> ?
                Cette action est irréversible.
              </p>
              {deleteError && (
                <p className="text-sm text-destructive">{deleteError}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDelete()}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
