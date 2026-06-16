export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'Retard',
  EXCUSED: 'Excusé',
};

export const ATTENDANCE_STATUS_TONE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-green-100 text-green-800 border-green-300',
  ABSENT: 'bg-red-100 text-red-800 border-red-300',
  LATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  EXCUSED: 'bg-slate-100 text-slate-700 border-slate-300',
};

/** Pastille de statut de présence — libellé FR + ton. */
export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ATTENDANCE_STATUS_TONE[status]}`}
    >
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}
