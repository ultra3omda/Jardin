interface DeckleEdgeProps {
  className?: string;
}

/**
 * DeckleEdge — decorative torn-paper top border for the featured Pricing card.
 * Color via currentColor — set via Tailwind text-* on the wrapping element.
 */
export function DeckleEdge({ className = '' }: DeckleEdgeProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 8"
      preserveAspectRatio="none"
      className={`block h-2 w-full text-current ${className}`}
    >
      <path
        d="M0 4 C 20 0, 40 8, 60 3 S 100 1, 130 5 S 170 2, 200 6 S 240 0, 270 4 S 310 7, 320 3 L 320 0 L 0 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}
