'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createInviteToken,
  type CreateInviteTokenResult,
  type InviteRole,
} from '@/lib/api/admin-invite-tokens';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  onClose: () => void;
}

const ROLES: { value: InviteRole; label: string }[] = [
  { value: 'SCHOOL_ADMIN', label: 'Admin école' },
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'STAFF', label: 'Personnel' },
];

const EXPIRES_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '24 heures' },
  { value: 2, label: '48 heures' },
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
];

/**
 * Modal to create a new invite token (SUPER_ADMIN only).
 *
 * On success the API returns the plaintext token + registration URL exactly
 * once, so the dialog switches to a "share this link" view rather than closing —
 * otherwise the operator would have no way to retrieve the link.
 */
export function CreateInviteModal({ onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('SCHOOL_ADMIN');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateInviteTokenResult | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createInviteToken(accessToken!, {
        invitedEmail: email.trim().toLowerCase() || undefined,
        intendedRole: role,
        expiresInDays,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'invite-tokens'] });
      setResult(data);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('E-mail requis');
      return;
    }
    setFormError(null);
    mutation.mutate();
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-invite-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {result ? (
          <>
            <h2
              id="create-invite-title"
              className="text-lg font-semibold text-[#1a2e5a]"
            >
              Invitation créée
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Copiez ce lien et transmettez-le à l&apos;invité. Il n&apos;est
              affiché qu&apos;une seule fois.
            </p>

            <div className="mt-4">
              <label
                htmlFor="invite-url"
                className="block text-sm font-medium text-[#1a2e5a]"
              >
                Lien d&apos;invitation
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="invite-url"
                  type="text"
                  readOnly
                  value={result.url}
                  onFocus={(e) => e.target.select()}
                  className="h-10 w-full rounded-md border bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e5a]/30"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  {copied ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
            </div>

            {result.invitedEmail && (
              <p className="mt-3 text-xs text-muted-foreground">
                Réservé à :{' '}
                <span className="font-medium">{result.invitedEmail}</span>
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Fermer
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id="create-invite-title"
              className="text-lg font-semibold text-[#1a2e5a]"
            >
              Créer une invitation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Un lien d&apos;invitation sera généré et associé à cet e-mail.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-medium text-[#1a2e5a]"
                >
                  E-mail *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utilisateur@exemple.fr"
                  required
                  autoFocus
                  className="mt-1 h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e5a]/30"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-sm font-medium text-[#1a2e5a]"
                >
                  Rôle *
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as InviteRole)}
                  className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e5a]/30"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="invite-expires"
                  className="block text-sm font-medium text-[#1a2e5a]"
                >
                  Expire dans *
                </label>
                <select
                  id="invite-expires"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e5a]/30"
                >
                  {EXPIRES_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <p className="text-sm text-rose-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 rounded-md border px-4 text-sm hover:bg-muted/50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Création…' : "Créer l'invitation"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
