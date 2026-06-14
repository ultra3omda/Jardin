import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for a row of 4 KPI cards.
 * Matches the billing/dashboard KPI card layout (number + label + sub-label).
 *
 * @example
 * {isLoading ? <KpiSkeleton /> : <KpiCards data={kpis} />}
 */
export function KpiSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Chargement des indicateurs"
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-paper-100 bg-white p-5 shadow-sm">
          {/* Big number placeholder */}
          <Skeleton className="mb-3 h-8 w-2/5" style={{ animationDelay: `${i * 80}ms` }} />
          {/* Label placeholder */}
          <Skeleton className="mb-2 h-3 w-3/5" style={{ animationDelay: `${i * 80 + 40}ms` }} />
          {/* Sub-label placeholder */}
          <Skeleton className="h-3 w-2/5" style={{ animationDelay: `${i * 80 + 80}ms` }} />
        </div>
      ))}
    </div>
  );
}
