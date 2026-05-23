'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiError, resetPassword } from '@/lib/api/client';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validation/auth.schemas';

const RESET_ERROR_COPY: Record<string, string> = {
  PASSWORD_RESET_TOKEN_UNKNOWN:
    "Ce lien de réinitialisation n'est pas reconnu. Demandez-en un nouveau.",
  PASSWORD_RESET_TOKEN_EXPIRED:
    'Ce lien de réinitialisation a expiré (validité : 24h). Demandez-en un nouveau.',
  PASSWORD_RESET_TOKEN_CONSUMED: 'Ce lien de réinitialisation a déjà été utilisé.',
};

function MissingTokenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lien invalide</CardTitle>
        <CardDescription>
          Ce lien de réinitialisation est incomplet ou tronqué.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Demandez un nouveau lien depuis la page de connexion.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button asChild className="w-full">
          <Link href="/forgot-password">Demander un nouveau lien</Link>
        </Button>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à la connexion
        </Link>
      </CardFooter>
    </Card>
  );
}

function ResetPasswordFormCard({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null);
    try {
      await resetPassword({ token: values.token, newPassword: values.newPassword });
      setSuccess(true);
      setTimeout(() => router.push('/login' as Route), 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code && RESET_ERROR_COPY[err.code]) {
          setServerError(RESET_ERROR_COPY[err.code] ?? err.message);
          return;
        }
        setServerError(err.message);
        return;
      }
      setServerError('Erreur réseau. Réessayez dans un instant.');
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            Mot de passe mis à jour
          </CardTitle>
          <CardDescription>
            Toutes vos sessions ont été déconnectées. Connectez-vous avec votre
            nouveau mot de passe.
          </CardDescription>
        </CardHeader>
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
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>
          Choisissez un nouveau mot de passe. Toutes vos sessions actives seront
          déconnectées.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <input type="hidden" {...form.register('token')} />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>Au moins 12 caractères.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmer le mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Définir le nouveau mot de passe
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Annuler
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get('token');
  if (!token || token.length < 20) {
    return <MissingTokenCard />;
  }
  return <ResetPasswordFormCard token={token} />;
}

function ResetPasswordFallback() {
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
