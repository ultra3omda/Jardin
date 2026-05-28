'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Monitor,
  Smartphone,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from '@/i18n/routing';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import {
  ApiError,
  changeMyPassword,
  deleteAccount,
  getNotificationPreferences,
  listSessions,
  logout,
  requestDataExport,
  revokeSession,
  updateNotificationPreferences,
  updateProfile,
  type ExportResultResponse,
  type NotificationPreferences,
  type SessionListItem,
} from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  locale: z.enum(['fr', 'en', 'ar', 'es']),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(12, 'Au moins 12 caractères').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

const PASSWORD_ERROR_COPY: Record<string, string> = {
  CURRENT_PASSWORD_INVALID: 'Le mot de passe actuel est incorrect.',
  NEW_PASSWORD_SAME_AS_CURRENT:
    "Le nouveau mot de passe doit être différent de l'actuel.",
};

export default function ProfilePage() {
  const router = useRouter();
  // Auth store exposes flat fields (no `session` aggregate). The `(app)/layout`
  // already gates on accessToken + user before rendering children, so this
  // guard is belt-and-suspenders for the SSR/hydration window.
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  if (!accessToken || !user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mon profil</h1>
        <p className="text-sm text-muted-foreground">
          Mettez à jour vos informations, votre mot de passe et gérez vos sessions.
        </p>
      </header>

      <ProfileCard accessToken={accessToken} setSession={setSession} />
      <PasswordCard accessToken={accessToken} router={router} />
      <NotificationsCard accessToken={accessToken} />
      <SessionsCard accessToken={accessToken} />
      <RgpdCard accessToken={accessToken} router={router} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profil — firstName / lastName / locale (+ email read-only)
// ---------------------------------------------------------------------------
function ProfileCard({
  accessToken,
  setSession,
}: {
  accessToken: string;
  setSession: ReturnType<typeof useAuthStore.getState>['setSession'];
}) {
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      locale: (user?.locale as 'fr' | 'en' | 'ar' | 'es') ?? 'fr',
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    setSuccess(false);
    try {
      const updated = await updateProfile(accessToken, values);
      // Rehydrate the store with the API's canonical shape — keeps Zustand
      // in sync after the user edits their own profile from this page.
      // AuthSessionResponse doesn't include refreshToken (httpOnly cookie).
      setSession({ accessToken, user: updated.user, tenant: updated.tenant });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
        return;
      }
      setServerError('Erreur réseau. Réessayez dans un instant.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
        <CardDescription>Votre nom et votre langue préférée.</CardDescription>
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
            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <AlertTitle>Enregistré</AlertTitle>
                <AlertDescription>Vos informations ont été mises à jour.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <FormLabel>Email</FormLabel>
              <Input value={user?.email ?? ''} disabled aria-readonly />
              <FormDescription>
                L&apos;email ne peut pas être modifié depuis cette page (V1.5).
              </FormDescription>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
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
                name="lastName"
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
              name="locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Langue</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                      <option value="es">Español</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Enregistrer
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mot de passe — current + new + confirm, then forced re-login
// ---------------------------------------------------------------------------
function PasswordCard({
  accessToken,
  router,
}: {
  accessToken: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: PasswordFormValues) {
    setServerError(null);
    try {
      await changeMyPassword(accessToken, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccess(true);
      // All sessions just got revoked server-side — log out the client and
      // redirect to /login. Pause briefly so the user sees the confirmation.
      setTimeout(async () => {
        try {
          await logout();
        } catch {
          /* ignore */
        }
        router.push('/login?message=password-changed' as Route);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code && PASSWORD_ERROR_COPY[err.code]) {
          setServerError(PASSWORD_ERROR_COPY[err.code] ?? err.message);
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
        <CardTitle>Mot de passe</CardTitle>
        <CardDescription>
          Choisir un nouveau mot de passe déconnectera toutes vos sessions
          actives, y compris celle-ci.
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
            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <AlertTitle>Mot de passe mis à jour</AlertTitle>
                <AlertDescription>
                  Redirection vers la page de connexion…
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe actuel</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormLabel>Confirmer</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting || success}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Changer le mot de passe
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Accessible toggle switch (no extra dependency — native button + ARIA)
// ---------------------------------------------------------------------------
function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notifications — push (mobile) + email delivery preferences (V10)
// ---------------------------------------------------------------------------
function NotificationsCard({ accessToken }: { accessToken: string }) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<
    'pushEnabled' | 'emailNotificationsEnabled' | null
  >(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getNotificationPreferences(accessToken);
        if (active) setPrefs(data);
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : 'Erreur réseau.');
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleToggle(
    key: 'pushEnabled' | 'emailNotificationsEnabled',
    next: boolean,
  ) {
    if (!prefs) return;
    setSaveError(null);
    setSavingKey(key);
    const previous = prefs;
    // Optimistic update — revert on failure so the UI never lies.
    setPrefs({ ...prefs, [key]: next });
    try {
      const updated = await updateNotificationPreferences(accessToken, { [key]: next });
      setPrefs(updated);
    } catch (err) {
      setPrefs(previous);
      setSaveError(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choisissez comment être averti(e) des nouveautés (messages, notes,
          absences, factures, annonces). Les notifications dans l&apos;application
          restent toujours actives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {loadError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : prefs === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement des préférences…
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <li className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <Smartphone
                  className="mt-0.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Notifications push (mobile)</p>
                  <p className="text-xs text-muted-foreground">
                    {prefs.pushRegistered
                      ? 'Reçues sur votre application mobile École SaaS.'
                      : "Activez-les puis ouvrez l'application mobile pour enregistrer votre appareil."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savingKey === 'pushEnabled' && (
                  <Loader2
                    className="h-4 w-4 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <ToggleSwitch
                  id="pref-push"
                  label="Activer les notifications push mobile"
                  checked={prefs.pushEnabled}
                  disabled={savingKey !== null}
                  onChange={(next) => handleToggle('pushEnabled', next)}
                />
              </div>
            </li>
            <li className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Notifications par email</p>
                  <p className="text-xs text-muted-foreground">
                    Envoyées à votre adresse email enregistrée.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savingKey === 'emailNotificationsEnabled' && (
                  <Loader2
                    className="h-4 w-4 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <ToggleSwitch
                  id="pref-email"
                  label="Activer les notifications par email"
                  checked={prefs.emailNotificationsEnabled}
                  disabled={savingKey !== null}
                  onChange={(next) => handleToggle('emailNotificationsEnabled', next)}
                />
              </div>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sessions — list with revoke per-row
// ---------------------------------------------------------------------------
function SessionsCard({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const rows = await listSessions(accessToken);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await revokeSession(accessToken, id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions actives</CardTitle>
        <CardDescription>
          Chaque ligne correspond à un appareil ou navigateur connecté. Vous
          pouvez en révoquer une à tout moment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {items === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement des sessions…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune session active. Étrange — vous êtes connecté(e) en ce moment !
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-3">
                  <Monitor className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <div className="space-y-0.5 text-sm">
                    <p className="font-medium">{s.userAgent ?? 'User-agent inconnu'}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.ip ?? 'IP masquée'} · créée le{' '}
                      {new Date(s.createdAt).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(s.id)}
                  disabled={revokingId === s.id}
                  aria-label={`Révoquer la session ${s.id}`}
                >
                  {revokingId === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-2">Révoquer</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RGPD — export + soft-delete
// ---------------------------------------------------------------------------
function RgpdCard({
  accessToken,
  router,
}: {
  accessToken: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResultResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      const res = await requestDataExport(accessToken);
      setExportResult(res);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'R2_NOT_CONFIGURED') {
        setExportError("L'export de données n'est pas encore configuré côté serveur.");
        return;
      }
      setExportError(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(accessToken);
      try {
        await logout();
      } catch {
        /* ignore */
      }
      router.push('/login?message=account-deleted' as Route);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur réseau.');
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes données (RGPD)</CardTitle>
        <CardDescription>
          Exportez ou supprimez l&apos;ensemble de vos données stockées par École SaaS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Export de mes données</h3>
          <p className="text-sm text-muted-foreground">
            Téléchargez un fichier ZIP contenant l&apos;intégralité des données
            stockées par École SaaS vous concernant.
          </p>
          {exportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}
          {exportResult ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-4">
              <p className="text-sm font-medium text-emerald-700">
                ✓ Export prêt — le lien vous a été envoyé par email.
              </p>
              <Button asChild size="sm">
                <a href={exportResult.downloadUrl} download>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Télécharger maintenant
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                Le lien expire le{' '}
                {new Date(exportResult.expiresAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
                .
              </p>
            </div>
          ) : (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Générer mon export
            </Button>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-rose-700">Suppression du compte</h3>
          <p className="text-sm text-muted-foreground">
            Action irréversible. Toutes vos sessions seront révoquées et votre
            compte marqué comme supprimé (conformément à nos obligations RGPD,
            le journal d&apos;activité reste conservé 2 ans).
          </p>
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          {confirmingDelete ? (
            <div className="flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50/40 p-4">
              <p className="text-sm font-medium">
                Êtes-vous sûr(e) ? Cette action est irréversible.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Oui, supprimer mon compte
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Supprimer mon compte
            </Button>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
