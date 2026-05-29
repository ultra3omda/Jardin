'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Link } from '@/i18n/routing';
import { createClass, listClasses, type SchoolClass } from '@/lib/api/classes';
import { DEMO_SCHOOL_CLASSES } from '@/lib/demo/classes';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

// ─── Demo fallback data ───────────────────────────────────────────────────────
// Fixtures live in @/lib/demo/classes (enriched with a main teacher + weekly
// timetable) so the class detail view falls back to the SAME data — a demo
// list → detail click never shows "Class not found".

// ─────────────────────────────────────────────────────────────────────────────

export function ClassesList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', level: '', schoolYear: CURRENT_YEAR });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: queryErr } = useQuery({
    queryKey: ['classes', 'list'],
    queryFn: () => listClasses(accessToken!),
    enabled: !!accessToken,
  });

  const createMutation = useMutation({
    mutationFn: () => createClass(accessToken!, form),
    onSuccess: () => {
      setShowForm(false);
      setForm({ name: '', level: '', schoolYear: CURRENT_YEAR });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['classes', 'list'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'CREATE_FAILED'),
  });

  if (!accessToken) return <p className="text-sm text-muted-foreground">Authentification requise.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  // On error or empty API response, fall back to demo data so the UI is never blank
  const items = (queryErr || !data?.items?.length) ? DEMO_SCHOOL_CLASSES : data.items;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          {showForm ? 'Annuler' : '+ Nouvelle classe'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name || !form.level || !/^\d{4}-\d{4}$/.test(form.schoolYear)) {
              setError('VALIDATION');
              return;
            }
            createMutation.mutate();
          }}
          className="space-y-4 rounded-lg border bg-card p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium" htmlFor="cls-name">Nom *</label>
              <input
                id="cls-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="CP-A"
                className="mt-1 h-10 w-full rounded-md border px-3"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cls-level">Niveau *</label>
              <input
                id="cls-level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                placeholder="CP"
                className="mt-1 h-10 w-full rounded-md border px-3"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cls-year">Année scolaire *</label>
              <input
                id="cls-year"
                value={form.schoolYear}
                onChange={(e) => setForm({ ...form, schoolYear: e.target.value })}
                pattern="^\d{4}-\d{4}$"
                className="mt-1 h-10 w-full rounded-md border px-3"
              />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">Erreur : {error}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="h-10 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Création...' : 'Créer la classe'}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune classe pour l&apos;instant.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
          {items.map((c: SchoolClass) => (
            <li key={c.id}>
              <Link
                href={`/classes/${c.id}` as never}
                className="flex items-baseline justify-between gap-4 px-4 py-4 transition hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Niveau {c.level} · Année {c.schoolYear}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">Voir →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
