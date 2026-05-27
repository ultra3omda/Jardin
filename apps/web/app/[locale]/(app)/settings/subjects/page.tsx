'use client';

import { useState, useCallback, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useRouter } from '@/i18n/routing';
import { SubjectModal, type SubjectFormValues } from './_components/subject-modal';

/** Shape returned by GET /api/subjects → SubjectResponseDto */
interface Subject {
  id: string;
  name: string;
  code?: string | null;
  emoji?: string | null;
  coefficient: number;
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

/**
 * V7-E — Settings › Matières.
 * CRUD interface for subjects (name, emoji, coefficient).
 * Restricted to SCHOOL_ADMIN / SUPER_ADMIN.
 */
export default function SubjectsSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    setFetchError(null);
    try {
      const data = await apiFetch<Subject[]>('/api/subjects', accessToken);
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur de chargement.');
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

  function openEdit(subject: Subject) {
    setEditTarget(subject);
    setModalOpen(true);
  }

  async function handleModalSubmit(values: SubjectFormValues) {
    if (!accessToken) throw new Error('Session expirée.');
    if (editTarget) {
      const updated = await apiFetch<Subject>(
        `/api/subjects/${editTarget.id}`,
        accessToken,
        { method: 'PATCH', body: JSON.stringify(values) },
      );
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await apiFetch<Subject>('/api/subjects', accessToken, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSubjects((prev) => [...prev, created]);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !accessToken) return;
    setDeleteError(null);
    try {
      await apiFetch<null>(
        `/api/subjects/${deleteTarget.id}`,
        accessToken,
        { method: 'DELETE' },
      );
      setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
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
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Matières</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les matières enseignées dans votre établissement.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-ambre-500 hover:bg-ambre-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nouvelle matière
        </Button>
      </header>

      {/* Loading */}
      {loading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 underline hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && subjects.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucune matière configurée. Ajoutez votre première matière.
        </div>
      )}

      {/* Subjects table */}
      {!loading && subjects.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm" aria-label="Liste des matières">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3 w-12">Emoji</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3 w-32">Coefficient</th>
                <th className="px-4 py-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, idx) => (
                <tr
                  key={subject.id}
                  className={`border-b last:border-0 transition-colors hover:bg-slate-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="px-4 py-3 text-xl leading-none">
                    {subject.emoji ?? '📚'}
                  </td>
                  <td className="px-4 py-3 font-medium text-navy-900">
                    {subject.name}
                  </td>
                  <td className="px-4 py-3 text-navy-700">
                    {subject.coefficient}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier ${subject.name}`}
                        onClick={() => openEdit(subject)}
                        className="h-8 w-8 text-navy-600 hover:text-navy-900"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${subject.name}`}
                        onClick={() => { setDeleteError(null); setDeleteTarget(subject); }}
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
      <SubjectModal
        open={modalOpen}
        initial={
          editTarget
            ? {
                name: editTarget.name,
                emoji: editTarget.emoji ?? '',
                coefficient: editTarget.coefficient,
              }
            : undefined
        }
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmer la suppression"
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-xl bg-navy-900 px-6 py-4">
              <h2 className="text-base font-semibold text-white">Supprimer la matière</h2>
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
                <Button variant="destructive" onClick={() => void confirmDelete()}>
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
