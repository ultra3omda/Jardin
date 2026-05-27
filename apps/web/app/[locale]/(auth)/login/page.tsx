'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter, Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';

import { DemoAccountsBlock } from '@/components/auth/demo-accounts-block';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, login } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth.schemas';

interface LoginError {
  message: string;
  availableTenantSlugs?: string[];
}

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<LoginError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', tenantSlug: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const session = await login(values);
      setSession(session);
      const next = params.get('next');
      const target = next && next.startsWith('/') ? next : '/dashboard';
      router.push(target as never);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'TENANT_SLUG_REQUIRED') {
          const details = err.details as { availableTenantSlugs?: string[] } | undefined;
          setError({
            message: 'Plusieurs comptes correspondent à cet email. Précise ton établissement.',
            availableTenantSlugs: details?.availableTenantSlugs ?? [],
          });
          return;
        }
        if (err.status === 401) {
          setError({ message: 'Email ou mot de passe incorrect.' });
          return;
        }
        setError({ message: err.message });
        return;
      }
      setError({ message: 'Erreur réseau. Réessaye dans un instant.' });
    }
  }

  const showTenantField = (error?.availableTenantSlugs?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="font-serif text-2xl font-semibold text-ink-900">Bienvenue</h1>
        <p className="mt-1 text-sm text-ink-500">Connectez-vous à votre espace</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Connexion impossible</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.availableTenantSlugs && error.availableTenantSlugs.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {error.availableTenantSlugs.map((s) => (
                  <li key={s}><code>{s}</code></li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@etablissement.tn"
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
              aria-label={showPassword ? 'Masquer la saisie' : 'Afficher la saisie'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>

        {showTenantField && (
          <div className="space-y-1.5">
            <Label htmlFor="tenantSlug">Slug de l&apos;établissement</Label>
            <Input id="tenantSlug" placeholder="ex: demo-ecole" {...form.register('tenantSlug')} />
          </div>
        )}

        <div className="flex items-center justify-end text-sm">
          <Link href="/forgot-password" className="text-ink-500 hover:text-ambre-600">
            Mot de passe oublié ?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-ambre-500 hover:bg-ambre-600 text-white py-6 rounded-lg font-semibold"
        >
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Se connecter
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>

        <p className="text-center text-sm text-ink-500">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-ambre-600 hover:text-ambre-700">
            Inscrire votre école
          </Link>
        </p>
      </form>

      <DemoAccountsBlock />
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-ambre-500" aria-label="Chargement" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
