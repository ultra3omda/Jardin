'use client';

import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiError, verifyEmail } from '@/lib/api/client';

const VERIFY_ERROR_COPY: Record<string, string> = {
  EMAIL_VERIFICATION_TOKEN_UNKNOWN:
    "Ce lien de vérification n'est pas reconnu. Demandez-en un nouveau depuis votre profil.",
  EMAIL_VERIFICATION_TOKEN_EXPIRED:
    'Ce lien de vérification a expiré (validité : 48h). Demandez-en un nouveau.',
  EMAIL_VERIFICATION_TOKEN_CONSUMED:
    'Ce lien de vérification a déjà été utilisé. Votre email est probablement déjà confirmé.',
};

type Status = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    if (!token || token.length < 20) {
      setStatus('error');
      setErrorMessage('Lien de vérification invalide ou tronqué.');
      return;
    }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        setStatus('error');
        if (err instanceof ApiError) {
          const code = err.code;
          if (code && VERIFY_ERROR_COPY[code]) {
            setErrorMessage(VERIFY_ERROR_COPY[code] ?? err.message);
            return;
          }
          setErrorMessage(err.message);
          return;
        }
        setErrorMessage('Erreur réseau. Réessayez dans un instant.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmation en cours…</CardTitle>
          <CardDescription>Validation de votre adresse email.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Patientez un instant…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            Email confirmé
          </CardTitle>
          <CardDescription>Votre adresse email est désormais vérifiée.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vous pouvez maintenant vous connecter à votre espace École SaaS.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">
              Se connecter
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vérification impossible</CardTitle>
        <CardDescription>
          Nous n&apos;avons pas pu valider votre adresse email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Connectez-vous puis demandez un nouvel email depuis votre profil.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Aller à la connexion</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function VerifyEmailFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chargement…</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Patientez un instant…
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
