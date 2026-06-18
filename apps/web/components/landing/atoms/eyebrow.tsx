import type * as React from 'react';
interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Eyebrow — small uppercase teal label above a section title (Médina/B editorial
 * style). Uses the brand teal token so it follows the active theme.
 */
export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-terracotta ${className}`}
    >
      <span aria-hidden className="h-px w-6 bg-terracotta/50" />
      {children}
    </span>
  );
}
