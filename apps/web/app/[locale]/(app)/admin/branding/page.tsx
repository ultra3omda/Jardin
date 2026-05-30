'use client';

export default function AdminBrandingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Apparence globale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisation visuelle de la plateforme (logo, couleurs, nom public).
        </p>
      </header>

      <section className="rounded-lg border border-dashed p-6">
        <h2 className="text-base font-semibold text-muted-foreground">Fonctionnalité à venir</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La personnalisation de l’apparence globale n’est pas encore disponible. Cette section permettra
          prochainement de définir le logo, la palette de couleurs et le nom public de la plateforme. Aucun
          réglage n’est enregistré pour le moment.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pour toute demande de personnalisation, contactez{' '}
          <a className="underline" href="mailto:ultra3omda@gmail.com">
            ultra3omda@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
