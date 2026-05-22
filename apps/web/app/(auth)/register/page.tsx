'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Loader2, Mail } from 'lucide-react';
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
import { ApiError, register } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth.schemas';

const CONTACT_EMAIL = 'ultra3omda@gmail.com';

// Maps server-side invite error codes to FR copy. Centralised here for now;
// will move into the i18n catalog in V1.5 Group D.
const INVITE_ERROR_COPY: Record<string, string> = {
  INVITE_TOKEN_UNKNOWN: "Ce lien d'invitation n'est pas reconnu. Demandez-en un nouveau.",
  INVITE_TOKEN_EXPIRED: "Ce lien d'invitation a expiré. Demandez-en un nouveau.",
  INVITE_TOKEN_CONSUMED: "Ce lien d'invitation a déjà été utilisé.",
  INVITE_EMAIL_MISMATCH:
    "Ce lien d'invitation est réservé à une autre adresse email. Connectez-vous avec l'email d'origine.",
  INVITE_ROLE_NOT_SUPPORTED_FOR_REGISTER:
    "Ce type d'invitation ne permet pas de créer un établissement. Contactez votre administrateur.",
};

/**
 * Shown when the user lands on /register without a ?token= query param.
 * Invite-only since V1.5 (Q4=B) — public self-service signup is disabled.
 */
function NoInviteCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inscription sur invitation</CardTitle>
        <CardDescription>
          La création d&apos;un établissement sur École SaaS se fait uniquement sur
          invitation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Si vous avez reçu un lien par email, ouvrez-le directement — il contient le
          jeton d&apos;inscription nécessaire.
        </p>
        <div className="rounded-md border bg-muted/40 p-4">
          <p className="text-sm font-medium">Pour demander un accès :</p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Demande%20d'acc%C3%A8s%20%C3%89cole%20SaaS`}
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {CONTACT_EMAIL}
          </a>
        </div>
      </CardContent>
      <CardFooter>
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

function RegisterFormCard({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      inviteToken,
      tenant: { name: '', slug: '', type: 'KINDERGARTEN' },
      admin: { email: '', firstName: '', lastName: '', password: '' },
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const session = await register(values);
      setSession(session);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'TENANT_SLUG_TAKEN') {
          form.setError('tenant.slug', {
            type: 'manual',
            message: 'Ce slug est déjà utilisé. Choisissez-en un autre.',
          });
          return;
        }
        if (err.code && INVITE_ERROR_COPY[err.code]) {
          setServerError(INVITE_ERROR_COPY[err.code] ?? err.message);
          return;
        }
        setServerError(err.message);
        return;
      }
      setServerError('Erreur réseau. Réessayez dans un instant.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un établissement</CardTitle>
        <CardDescription>
          Créez le compte de votre école et son premier administrateur.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {/* Hidden invite token — pre-filled from the URL */}
            <input type="hidden" {...form.register('inviteToken')} />

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Établissement
              </legend>

              <FormField
                control={form.control}
                name="tenant.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l&apos;établissement</FormLabel>
                    <FormControl>
                      <Input placeholder="École Pilote Saint-Anne" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant.slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="ecole-pilote-saint-anne" {...field} />
                    </FormControl>
                    <FormDescription>
                      Identifiant unique en minuscules. Sert à l&apos;URL et à la connexion.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d&apos;établissement</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...field}
                      >
                        <option value="KINDERGARTEN">Jardin d&apos;enfants / Maternelle</option>
                        <option value="PRIMARY_SCHOOL">École primaire</option>
                        <option value="MIXED">Établissement mixte</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Administrateur initial
              </legend>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="admin.firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input autoComplete="given-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin.lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input autoComplete="family-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="admin.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="admin.password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>Au moins 12 caractères.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Créer l&apos;établissement
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function RegisterPageContent() {
  const params = useSearchParams();
  const inviteToken = params.get('token');
  if (!inviteToken || inviteToken.length < 20) {
    return <NoInviteCard />;
  }
  return <RegisterFormCard inviteToken={inviteToken} />;
}

function RegisterFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chargement…</CardTitle>
        <CardDescription>Vérification de votre invitation.</CardDescription>
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

export default function RegisterPage() {
  // useSearchParams requires a Suspense boundary in Next.js 14 App Router
  // so the page can render statically at build time.
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPageContent />
    </Suspense>
  );
}
