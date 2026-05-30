export const DEMO_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'DONE', 'DECLINED'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

/**
 * Upper bound on demo-related AuditLog rows fetched in a single platform read.
 * Demo requests are platform-level (low volume); this cap keeps the in-memory
 * `deriveDemoRequests` aggregation bounded instead of scanning the whole table.
 * Rows are fetched createdAt DESC, so the cap keeps the most recent activity.
 */
export const MAX_DEMO_AUDIT_ROWS = 5000;

export interface DemoRequestRecord {
  requestId: string;
  email: string;
  schoolName: string;
  studentsCount: number | null;
  locale: string | null;
  receivedAt: string;
  status: DemoStatus;
  note: string | null;
  statusUpdatedAt: string | null;
}

interface AuditLike {
  action: string;
  metadata: unknown;
  createdAt: Date;
}

export function isDemoStatus(value: unknown): value is DemoStatus {
  return typeof value === 'string' && (DEMO_STATUSES as readonly string[]).includes(value);
}

export function isPendingDemo(status: DemoStatus): boolean {
  return status === 'NEW' || status === 'CONTACTED';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/**
 * Build demo-request records from audit rows.
 * @param requestedRows `demo.requested` rows, ordered createdAt DESC.
 * @param statusRows `demo.status_changed` rows, ordered createdAt DESC (first seen per requestId = latest).
 */
export function deriveDemoRequests(requestedRows: AuditLike[], statusRows: AuditLike[]): DemoRequestRecord[] {
  const latestStatus = new Map<string, { status: DemoStatus; note: string | null; at: Date }>();
  for (const row of statusRows) {
    const meta = asRecord(row.metadata);
    const requestId = readString(meta.requestId);
    const status = meta.status;
    if (!requestId || !isDemoStatus(status) || latestStatus.has(requestId)) continue;
    latestStatus.set(requestId, { status, note: readString(meta.note), at: row.createdAt });
  }

  return requestedRows
    .map((row) => {
      const meta = asRecord(row.metadata);
      const requestId = readString(meta.requestId);
      if (!requestId) return null;
      const current = latestStatus.get(requestId);
      return {
        requestId,
        email: readString(meta.email) ?? '',
        schoolName: readString(meta.schoolName) ?? '',
        studentsCount: readNumber(meta.studentsCount),
        locale: readString(meta.locale),
        receivedAt: row.createdAt.toISOString(),
        status: current?.status ?? 'NEW',
        note: current?.note ?? null,
        statusUpdatedAt: current ? current.at.toISOString() : null,
      } satisfies DemoRequestRecord;
    })
    .filter((r): r is DemoRequestRecord => r !== null)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
