'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ApiError, login } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth.schemas';

interface LoginError {
  message: string;
  availableTenantSlugs?: string[];
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<LoginError | null>(null);

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
      // typedRoutes is enabled in next.config.mjs, so dynamic strings need
      // a Route cast. The `startsWith('/')` guard still prevents open-redirect.
      const target = (next && next.startsWith('/') ? next : '/dashboard') as Route;
      router.push(target);
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
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Accède à ton tableau de bord</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Connexion impossible</AlertTitle>
                <AlertDescription>
                  {error.message}
                  {error.availableTenantSlugs && error.availableTenantSlugs.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {error.availableTenantSlugs.map((s) => (
                        <li key={s}>
                          <code>{s}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="vous@etablissement.fr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showTenantField && (
              <FormField
                control={form.control}
                name="tenantSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug de l&apos;établissement</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: demo-maternelle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Se connecter
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Nouvel établissement ?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
