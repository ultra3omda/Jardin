import { Link } from '@/i18n/routing';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * V1.6 — Custom 404 displayed when /t/[slug]/* is hit with a slug that
 * doesn't match any active tenant. Falls back to default indigo theme
 * (the layout's brand fetch returned null so no style override).
 */
export default function TenantAuthNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>École introuvable</CardTitle>
        <CardDescription>
          Le code école de cette URL ne correspond à aucun établissement actif.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Vérifiez l&apos;URL auprès de votre administrateur d&apos;établissement.</p>
        <p>
          <Link href="/login" className="underline">
            Aller à la page de connexion générique
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
