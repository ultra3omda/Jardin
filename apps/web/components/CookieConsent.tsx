'use client';

import { X } from 'lucide-react';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

const STORAGE_KEY = 'ecole-saas-cookie-ack';

/**
 * Light cookie-consent banner.
 *
 * V1.5 uses a single httpOnly refresh cookie strictly necessary for the
 * auth flow — under EU RGPD / ePrivacy these don't require explicit
 * consent. This banner is informational only: it explains the cookie
 * usage and lets the user dismiss it. Choice persisted in localStorage.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const ack = window.localStorage.getItem(STORAGE_KEY);
      if (ack !== '1') {
        setVisible(true);
      }
    } catch {
      // SSR / localStorage disabled — silently no-op.
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Information cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="container flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Klasso n&apos;utilise qu&apos;un cookie strictement nécessaire à votre
          session d&apos;authentification. Aucun cookie publicitaire ou analytique
          n&apos;est posé.{' '}
          <Link href={'/legal/cookies' as Route} className="underline hover:text-foreground">
            En savoir plus
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={dismiss}>
            J&apos;ai compris
            <X className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
