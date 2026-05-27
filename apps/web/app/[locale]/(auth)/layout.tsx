import type { ReactNode } from 'react';

/**
 * V7 — Two-column auth layout. Left: navy gradient hero with brand + value
 * props. Right: child form (login/register/forgot/reset/verify). Locale is
 * already set by the parent `[locale]/layout.tsx`, so this layout does not
 * need its own setRequestLocale.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-paper-50">
      <aside className="hidden md:flex flex-col justify-between bg-gradient-to-br from-navy-900 via-[#143966] to-navy-700 p-10 text-white">
        <div>
          <div className="font-serif text-2xl font-bold">Klasso</div>
          <div className="mt-1 text-xs uppercase tracking-[0.08em] text-white/60">
            L&apos;école à l&apos;ère numérique
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <h1 className="font-serif text-[32px] leading-[1.15] font-medium">
            La plateforme qui <em className="not-italic underline decoration-ambre-500 decoration-4 underline-offset-4">simplifie</em> la gestion de votre établissement.
          </h1>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Notes et bulletins en quelques clics</li>
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Communication 1:1 avec les parents</li>
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Paiements intégrés Stripe + local</li>
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Adapté aux établissements africains</li>
          </ul>
        </div>

        <div className="text-xs text-white/40">© 2026 Klasso · Conçu pour les écoles africaines</div>
      </aside>

      <main className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
