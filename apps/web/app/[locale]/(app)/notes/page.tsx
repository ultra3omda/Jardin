'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface ClassOption { id: string; name: string; level: string; schoolYear: string }

const DEMO_CLASSES_NOTES: ClassOption[] = [
  { id: 'demo-class-1', name: 'CP-A', level: 'CP', schoolYear: '2025-2026' },
  { id: 'demo-class-2', name: 'CE1-B', level: 'CE1', schoolYear: '2025-2026' },
  { id: 'demo-class-3', name: 'CM1-A', level: 'CM1', schoolYear: '2025-2026' },
  { id: 'demo-class-4', name: 'CM2-B', level: 'CM2', schoolYear: '2025-2026' },
];

export default function NotesPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { items: ClassOption[] };
      const items = data.items ?? [];
      setClasses(items);
    } catch {
      setClasses([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Saisie des notes</h1>
        <p className="text-sm text-muted-foreground">Sélectionnez une classe pour saisir ou consulter les notes.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : classes.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Aucune classe configurée.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <a
              key={c.id}
              href={`/classes/${c.id}/grades`}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md hover:border-ambre-300"
            >
              <p className="font-semibold text-navy-900">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.level}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.schoolYear}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
