'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Teacher {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
}

interface TeacherFormValues {
  firstName: string;
  lastName: string;
  email: string;
}

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
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

export default function TeachersPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Teacher | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<TeacherFormValues>({ firstName: '', lastName: '', email: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiFetch<{ items: Teacher[]; total: number }>('/api/teachers', token);
      setTeachers(data.items ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setFormValues({ firstName: '', lastName: '', email: '' });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(t: Teacher) {
    setEditTarget(t);
    setFormValues({ firstName: t.firstName, lastName: t.lastName, email: t.email });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        await apiFetch(`/api/teachers/${editTarget.id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ firstName: formValues.firstName, lastName: formValues.lastName }),
        });
      } else {
        const result = await apiFetch<Teacher & { tempPassword?: string }>('/api/teachers', token, {
          method: 'POST',
          body: JSON.stringify(formValues),
        });
        if (result?.tempPassword) setTempPassword(result.tempPassword);
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!token || !deactivateTarget) return;
    setDeactivateError(null);
    try {
      await apiFetch(`/api/teachers/${deactivateTarget.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      setDeactivateTarget(null);
      void load();
    } catch (e) {
      setDeactivateError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Enseignants</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les enseignants et leur affectation aux classes.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 text-sm font-medium text-white"
          >
            + Nouvel enseignant
          </button>
        )}
      </header>

      {tempPassword && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Mot de passe temporaire :</strong> <code className="font-mono">{tempPassword}</code>
          {' '}— Notez-le, il ne sera plus affiché.
          <button onClick={() => setTempPassword(null)} className="ml-4 underline">Fermer</button>
        </div>
      )}

      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erreur : {fetchError}
          <button onClick={() => void load()} className="ml-2 underline">Réessayer</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : teachers.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucun enseignant pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Ajouté le</th>
                {isAdmin && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{t.lastName} {t.firstName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.deletedAt ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {t.deletedAt ? 'Désactivé' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(t)} className="text-xs text-blue-600 hover:underline">Modifier</button>
                        {!t.deletedAt && (
                          <button onClick={() => { setDeactivateTarget(t); setDeactivateError(null); }} className="text-xs text-red-600 hover:underline">
                            Désactiver
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {editTarget ? 'Modifier l\'enseignant' : 'Nouvel enseignant'}
            </h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Prénom</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formValues.firstName}
                  onChange={(e) => setFormValues((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nom</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={formValues.lastName}
                  onChange={(e) => setFormValues((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
              {!editTarget && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={formValues.email}
                    onChange={(e) => setFormValues((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
              )}
              {formError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border px-4 py-2 text-sm">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Désactiver l&apos;enseignant</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Confirmer la désactivation de <strong>{deactivateTarget.firstName} {deactivateTarget.lastName}</strong> ?
            </p>
            {deactivateError && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deactivateError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeactivateTarget(null)} className="rounded-md border px-4 py-2 text-sm">
                Annuler
              </button>
              <button onClick={() => { void handleDeactivate(); }} className="rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white">
                Désactiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}