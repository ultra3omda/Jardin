'use client';

import { Button } from '@/components/ui/button';

export interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorRetry({ message, onRetry }: ErrorRetryProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <p>{message ?? 'Une erreur est survenue lors du chargement.'}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
