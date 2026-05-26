import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  id?: string;
  alt?: boolean;
  bleed?: boolean;
  grain?: boolean;
  className?: string;
}

/**
 * Section — consistent vertical rhythm wrapper for landing sections.
 * 96px padding on desktop (py-24), 64px on mobile (py-16). Toggle `alt` to use
 * the warmer `--paper-2` background for editorial rhythm.
 */
export function Section({
  children,
  id,
  alt = false,
  bleed = false,
  grain = false,
  className = '',
}: SectionProps) {
  const bg = alt ? 'bg-paper-alt' : 'bg-paper';
  return (
    <section
      id={id}
      className={`relative isolate ${bg} ${grain ? 'paper-grain' : ''} py-16 sm:py-24 ${className}`}
    >
      <div className={`relative z-10 ${bleed ? '' : 'container mx-auto px-4'}`}>{children}</div>
    </section>
  );
}
