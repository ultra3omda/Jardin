'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface ParentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  deletedAt: string | null;
  createdAt: string;
}

async function apiFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(text || `HTTP ${res.status}`); }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

export default function ParentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [parents, setParents] = useState<ParentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setFetchError(null);
    try {
      const data = await apiFetch<{ items: ParentUser[] }>('/api/parents', token);
      setParents(data.items ?? []);
    } catch (e) { setFetchError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const filtered = parents.filter((p) =>
    `${p.firstName} ${p.lastName}${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true); setFormError(null);
    try {
      const result = await apiFetch<ParentUser & { tempPassword?: string }>('/api/parents', token, {
        method: 'POST', body: JSON.stringify(form),
      });
      if (result?.tempPassword) setTempPassword(result.tempPassword);
      setModalOpen(false); setForm({ firstName: '', lastName: '', email: '' });
      void load();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Parents</h1>
          <p className="text-sm text-muted-foreground">Répertoire des parents et tuteurs légaux.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setModalOpen(true); setFormError(null); }}
            className="inline-flex h-10 items-center rounded-md bg-ambre-500 hover:bg-ambre-600 px-4 text-sm font-medium text-white">
            + Nouveau parent
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

      <input
        className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
        placeholder="Rechercher un parent…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erreur : {fetchError} <button onClick={() => void load()} className="ml-2 underline">Réessayer</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucun parent trouvé.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="font-semibold text-navy-900">{p.firstName} {p.lastName}</p>
              <p className="text-sm text-muted-foreground">{p.email}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.deletedAt ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {p.deletedAt ? 'Désactivé' : 'Compte actif'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Nouveau parent</h2>
            <form onSubmit={(e) => { void handleCreate(e); }} className="space-y-4">
              {(['firstName', 'lastName'] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-sm font-medium">{field === 'firstName' ? 'Prénom' : 'Nom'}</label>
                  <input className="w-full rounded-md border px-3 py-2 text-sm" value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} required />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input type="email" className="w-full rounded-md border px-3 py-2 text-sm" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
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
    </div>
  );
}