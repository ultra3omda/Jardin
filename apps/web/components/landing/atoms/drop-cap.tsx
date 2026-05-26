import type { ReactNode } from 'react';

interface DropCapProps {
  children: string;
  className?: string;
}

/**
 * DropCap — editorial first-letter accent. Renders the first character of a string
 * inside a styled <span class="drop-cap"> followed by the rest of the text.
 * Style: 56px Fraunces italic, terracotta color, float on the inline-start side.
 */
export function DropCap({ children, className }: DropCapProps): ReactNode {
  if (!children || children.length === 0) return null;
  const first = children[0];
  const rest = children.slice(1);
  return (
    <p className={className}>
      <span className="drop-cap float-[inline-start] me-2 mt-1 font-display text-[56px] leading-none italic text-terracotta">
        {first}
      </span>
      {rest}
    </p>
  );
}
