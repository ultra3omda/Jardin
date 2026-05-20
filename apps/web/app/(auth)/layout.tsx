import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">École SaaS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestion d&apos;établissement scolaire
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
