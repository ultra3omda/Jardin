'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'ALL' | 'PARENTS' | 'TEACHERS' | 'STAFF';
  authorName: string;
  publishAt: string;
  createdAt: string;
}

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'Tous',
  PARENTS: 'Parents',
  TEACHERS: 'Enseignants',
  STAFF: 'Personnel',
};

const AUDIENCE_COLORS: Record<string, string> = {
  ALL: 'bg-blue-100 text-blue-800',
  PARENTS: 'bg-green-100 text-green-800',
  TEACHERS: 'bg-purple-100 text-purple-800',
  STAFF: 'bg-orange-100 text-orange-800',
};

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || `HTTP ${res.status}`); }
  const t = await res.text();
  return t ? (JSON.parse(t) as T) : (null as T);
}

export default function AnnouncementsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL', publishAt: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: Announcement[] }>('/api/announcements', token);
      setAnnouncements(data.items ?? []);
    } catch {
      setAnnouncements([]);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm({ title: '', body: '', audience: 'ALL', publishAt: new Date().toISOString().slice(0, 16) });
    setFormError(null); setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditTarget(a);
    setForm({ title: a.title, body: a.body, audience: a.audience, publishAt: new Date(a.publishAt).toISOString().slice(0, 16) });
    setFormError(null); setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true); setFormError(null);
    try {
      if (editTarget) {
        await apiFetch(`/api/announcements/${editTarget.id}`, token, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiFetch('/api/announcements', token, { method: 'POST', body: JSON.stringify(form) });
      }
      setModalOpen(false); void load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleteError(null);
    try {
      await apiFetch(`/api/announcements/${deleteTarget.id}`, token, { method: 'DELETE' });
      setDeleteTarget(null); void load();
    } catch (e) { setDeleteError(e instanceof Error ? e.message : 'Erreur'); }
  }

  const displayed = announcements;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Annonces</h1>
          <p className="text-sm text-muted-foreground">Publiez et consultez les annonces de l&apos;établissement.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="inline-flex h-10 items-center rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 text-sm font-medium text-white">
            + Nouvelle annonce
          </button>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : displayed.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Aucune annonce publiée.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((a) => (
            <div key={a.id} className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AUDIENCE_COLORS[a.audience] ?? 'bg-slate-100 text-slate-700'}`}>
                  {AUDIENCE_LABELS[a.audience] ?? a.audience}
                </span>
                {isAdmin && (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => openEdit(a)} className="text-blue-600 hover:underline">Modifier</button>
                    <button onClick={() => { setDeleteTarget(a); setDeleteError(null); }} className="text-red-600 hover:underline">Supprimer</button>
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-navy-900 leading-snug">{a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{a.body}</p>
              </div>
              <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.authorName}</span>
                <span>{new Date(a.publishAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{editTarget ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h2>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Titre</label>
                <input className="w-full rounded-md border px-3 py-2 text-sm" value={form.title} maxLength={200}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Message</label>
                <textarea rows={5} className="w-full rounded-md border px-3 py-2 text-sm resize-none" value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Audience</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.audience}
                  onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))}>
                  <option value="ALL">Tous</option>
                  <option value="PARENTS">Parents</option>
                  <option value="TEACHERS">Enseignants</option>
                  <option value="STAFF">Personnel</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date de publication</label>
                <input type="datetime-local" className="w-full rounded-md border px-3 py-2 text-sm" value={form.publishAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishAt: e.target.value }))} required />
              </div>
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold">Supprimer l&apos;annonce</h2>
            <p className="mb-4 text-sm text-muted-foreground">Voulez-vous vraiment supprimer <strong>&quot;{deleteTarget.title}&quot;</strong> ? Cette action est irréversible.</p>
            {deleteError && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-md border px-4 py-2 text-sm">Annuler</button>
              <button onClick={() => void handleDelete()} className="rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}