'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const TENANT_TYPE_LABELS: Record<string, string> = {
  KINDERGARTEN: "Jardin d'enfants / Maternelle",
  PRIMARY_SCHOOL: 'École primaire',
  MIXED: 'Établissement mixte',
};

const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super-admin plateforme',
  SCHOOL_ADMIN: 'Directeur / Directrice',
  TEACHER: 'Enseignant(e)',
  PARENT: 'Parent',
  STAFF: 'Personnel',
};

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();
  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {user.firstName} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {tenant
            ? `Tu es connecté(e) au tableau de bord de ${tenant.name}.`
            : 'Compte plateforme.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Établissement</CardTitle>
            <CardDescription>Détails du tenant courant</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Row label="Nom" value={tenant?.name} />
              <Row label="Slug" value={tenant?.slug} mono />
              <Row
                label="Type"
                value={tenant ? TENANT_TYPE_LABELS[tenant.type] ?? tenant.type : null}
              />
              <Row label="Locale" value={tenant?.locale?.toUpperCase()} />
              <Row label="Timezone" value={tenant?.timezone} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Utilisateur courant</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Row label="Email" value={user.email} />
              <Row label="Rôle" value={USER_ROLE_LABELS[user.role] ?? user.role} />
              <Row label="Langue" value={user.locale.toUpperCase()} />
              <Row label="ID" value={user.id} mono />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vague 1 ✓</CardTitle>
            <CardDescription>Auth multi-tenant livrée</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Modules en cours de développement :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Élèves (Vague 2)</li>
              <li>Parents (Vague 3)</li>
              <li>Enseignants &amp; Classes (Vague 4)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-xs' : 'font-medium'}>{value ?? '—'}</dd>
    </div>
  );
}
