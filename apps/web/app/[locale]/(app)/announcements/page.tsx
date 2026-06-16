'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { useCircularAttachmentUploadUrl } from '@/lib/api/calendar';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorRetry } from '@/components/ui/error-retry';

type AnnouncementKind = 'NEWS' | 'CIRCULAIRE';

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'ALL' | 'PARENTS' | 'TEACHERS' | 'STAFF';
  kind: AnnouncementKind;
  attachmentUrl: string | null;
  authorName: string;
  publishAt: string;
  createdAt: string;
}

const KIND_LABELS: Record<AnnouncementKind, string> = {
  NEWS: 'Actualité',
  CIRCULAIRE: 'Circulaire',
};

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
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'ALL',
    publishAt: '',
    kind: 'NEWS' as AnnouncementKind,
    attachmentUrl: '' as string,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadMutation = useCircularAttachmentUploadUrl();

  const load = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      const data = await apiFetch<{ items: Announcement[] }>('/api/announcements', token);
      setAnnouncements(data.items ?? []);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm({ title: '', body: '', audience: 'ALL', publishAt: new Date().toISOString().slice(0, 16), kind: 'NEWS', attachmentUrl: '' });
    setFormError(null); setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditTarget(a);
    setForm({ title: a.title, body: a.body, audience: a.audience, publishAt: new Date(a.publishAt).toISOString().slice(0, 16), kind: a.kind ?? 'NEWS', attachmentUrl: a.attachmentUrl ?? '' });
    setFormError(null); setModalOpen(true);
  }

  async function handlePdfSelected(file: File) {
    setFormError(null);
    setUploading(true);
    try {
      const finalUrl = await uploadMutation.mutateAsync(file);
      setForm((p) => ({ ...p, attachmentUrl: finalUrl }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Téléversement impossible.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (form.kind === 'CIRCULAIRE' && !form.attachmentUrl) {
      setFormError('Un fichier PDF est requis pour une circulaire.');
      return;
    }
    setSubmitting(true); setFormError(null);
    const payload = {
      title: form.title,
      body: form.body,
      audience: form.audience,
      publishAt: form.publishAt,
      kind: form.kind,
      attachmentUrl: form.kind === 'CIRCULAIRE' ? form.attachmentUrl : null,
    };
    try {
      if (editTarget) {
        await apiFetch(`/api/announcements/${editTarget.id}`, token, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/announcements', token, { method: 'POST', body: JSON.stringify(payload) });
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
      <PageHeader
        title="Annonces"
        description="Publiez et consultez les annonces de l'établissement."
        actions={
          isAdmin ? (
            <button onClick={openCreate} className="inline-flex h-10 items-center rounded-md bg-ambre-500 px-4 text-sm font-medium text-white hover:bg-ambre-600">
              + Nouvelle annonce
            </button>
          ) : undefined
        }
      />

      {loadState === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : loadState === 'error' ? (
        <ErrorRetry message="Impossible de charger les annonces." onRetry={() => void load()} />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8" aria-hidden="true" />}
          title="Aucune annonce publiée"
          description="Les annonces de l'établissement apparaîtront ici."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((a) => (
            <div key={a.id} className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${AUDIENCE_COLORS[a.audience] ?? 'bg-slate-100 text-slate-700'}`}>
                    {AUDIENCE_LABELS[a.audience] ?? a.audience}
                  </span>
                  {a.kind === 'CIRCULAIRE' && (
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                      {KIND_LABELS.CIRCULAIRE}
                    </span>
                  )}
                </div>
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
              {a.attachmentUrl && (
                <a
                  href={a.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-navy-900 hover:bg-muted"
                >
                  <span aria-hidden="true">📎</span> PDF
                </a>
              )}
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
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.kind}
                  onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as AnnouncementKind, attachmentUrl: e.target.value === 'CIRCULAIRE' ? p.attachmentUrl : '' }))}>
                  <option value="NEWS">Actualité</option>
                  <option value="CIRCULAIRE">Circulaire (PDF)</option>
                </select>
              </div>
              {form.kind === 'CIRCULAIRE' && (
                <div>
                  <label htmlFor="ann-pdf" className="mb-1 block text-sm font-medium">Fichier PDF</label>
                  {form.attachmentUrl && (
                    <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy-900 hover:underline">
                        <span aria-hidden="true">📎</span> PDF téléversé
                      </a>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, attachmentUrl: '' }))} className="text-rose-600 hover:underline">Retirer</button>
                    </p>
                  )}
                  <input
                    id="ann-pdf"
                    type="file"
                    accept="application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePdfSelected(file);
                      e.target.value = '';
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                  />
                  {uploading && <p className="mt-1 text-xs text-muted-foreground">Téléversement en cours…</p>}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">Date de publication</label>
                <input type="datetime-local" className="w-full rounded-md border px-3 py-2 text-sm" value={form.publishAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishAt: e.target.value }))} required />
              </div>
              {formError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border px-4 py-2 text-sm">Annuler</button>
                <button type="submit" disabled={submitting || uploading} className="rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 py-2 text-sm text-white disabled:opacity-50">
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