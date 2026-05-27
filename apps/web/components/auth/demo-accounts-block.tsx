'use client';

import { GraduationCap, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';

import { demoLogin, type DemoPersona } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface PersonaButton {
  persona: DemoPersona;
  label: string;
  email: string;
  icon: typeof Users;
}

const PERSONAS_PRIMARY: PersonaButton[] = [
  { persona: 'admin-primary',   label: 'Direction',  email: 'admin@demo-ecole.klasso.tn',  icon: ShieldCheck },
  { persona: 'teacher-primary', label: 'Enseignant', email: 'prof@demo-ecole.klasso.tn',   icon: GraduationCap },
  { persona: 'parent-primary',  label: 'Parent',     email: 'parent@demo-ecole.klasso.tn', icon: Users },
  { persona: 'teacher-kindergarten', label: 'Animateur', email: 'anim@demo-maternelle.klasso.tn', icon: Sparkles },
];

const PERSONAS_MORE: PersonaButton[] = [
  { persona: 'admin-kindergarten',  label: 'Dir. Maternelle',   email: 'admin@demo-maternelle.klasso.tn',  icon: ShieldCheck },
  { persona: 'parent-kindergarten', label: 'Parent maternelle', email: 'parent@demo-maternelle.klasso.tn', icon: Users },
  { persona: 'staff',               label: 'Personnel',         email: 'staff@demo-ecole.klasso.tn',       icon: Users },
  { persona: 'super-admin',         label: 'Super-admin',       email: 'super@klasso.tn',                  icon: ShieldCheck },
];

export function DemoAccountsBlock() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [loadingPersona, setLoadingPersona] = useState<DemoPersona | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(persona: DemoPersona) {
    if (loadingPersona) return;
    setLoadingPersona(persona);
    setError(null);
    try {
      const session = await demoLogin(persona);
      setSession(session);
      router.push('/dashboard' as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur démo. Réessaye.');
      setLoadingPersona(null);
    }
  }

  function renderButton(p: PersonaButton) {
    const Icon = p.icon;
    const loading = loadingPersona === p.persona;
    return (
      <button
        key={p.persona}
        type="button"
        disabled={!!loadingPersona}
        onClick={() => handleClick(p.persona)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-surface p-2.5 text-left text-xs transition hover:border-ambre-500 hover:bg-ambre-50 disabled:opacity-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ambre-50 text-ambre-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink-900">{p.label}</span>
          <span className="block truncate text-[10px] text-ink-300">{p.email}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-paper-100 p-4">
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        Comptes de démonstration
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PERSONAS_PRIMARY.map(renderButton)}
      </div>

      {showMore && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PERSONAS_MORE.map(renderButton)}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-3 w-full text-center text-[11px] font-semibold text-ambre-600 hover:text-ambre-700"
      >
        {showMore ? '— Moins de démos' : '+ Plus de démos (4 autres personas)'}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
