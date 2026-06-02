import { useAuthStore } from '@/lib/auth/store';

/**
 * Lot 2 — Présences (mobile). Pointage journalier par classe (admin + enseignant).
 * Miroir de apps/api/src/attendance/attendance.controller.ts.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string | null;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedById: string;
}

export interface AttendanceEntryInput {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

interface ListAttendanceResponse {
  items: AttendanceRecord[];
  total: number;
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string>),
  };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: { message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* noop */
    }
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function fetchAttendance(classId: string, date: string): Promise<ListAttendanceResponse> {
  const qs = new URLSearchParams({ classId, date });
  return authed(`/api/attendance?${qs.toString()}`);
}

export function saveAttendanceBulk(
  classId: string,
  date: string,
  entries: AttendanceEntryInput[],
): Promise<AttendanceRecord[]> {
  return authed('/api/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({ classId, date, entries }),
  });
}
