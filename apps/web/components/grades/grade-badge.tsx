import { gradeTone, type GradeTone } from '@/lib/grades/grade-tone';

const TONE: Record<GradeTone, string> = {
  good: 'bg-green-100 text-green-800',
  ok: 'bg-ambre-100 text-ambre-700',
  low: 'bg-red-100 text-red-800',
};

/** Pastille de note colorée par seuil. `null` → tiret neutre. */
export function GradeBadge({ value, outOf = 20 }: { value: number | null; outOf?: number }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        —
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold ${TONE[gradeTone(value, outOf)]}`}
    >
      {value.toFixed(2)}/{outOf}
    </span>
  );
}
