interface ZelligePatternProps {
  className?: string;
  opacity?: number;
}

/**
 * ZelligePattern — abstracted 8-pointed Maghrebi star repeated as a subtle bg.
 * Custom-designed (not stock). Inherits color from text-* class on parent.
 */
export function ZelligePattern({ className = '', opacity = 0.08 }: ZelligePatternProps) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g fill='none' stroke='currentColor' stroke-width='1.2' opacity='${opacity}'><path d='M32 8 L36 24 L52 20 L40 32 L52 44 L36 40 L32 56 L28 40 L12 44 L24 32 L12 20 L28 24 Z'/><circle cx='32' cy='32' r='3'/></g></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 text-terracotta ${className}`}
      style={{ backgroundImage: url, backgroundSize: '64px 64px' }}
    />
  );
}
