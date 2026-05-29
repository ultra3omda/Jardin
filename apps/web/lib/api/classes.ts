'use client';

/** V4 — Classes / EDT API client (REST). */
const BASE = '/api/classes';

export interface TeacherSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ClassTeacher {
  id: string;
  classId: string;
  teacherUserId: string;
  subject: string;
  isMainTeacher: boolean;
  createdAt: string;
  teacher?: TeacherSummary;
}

export interface TimeSlot {
  id: string;
  classId: string;
  dayOfWeek: number;
  periodStart: string;
  periodEnd: string;
  subject: string;
  teacherUserId?: string | null;
  room?: string | null;
  createdAt: string;
  updatedAt: string;
  teacher?: TeacherSummary | null;
}

export interface SchoolClass {
  id: string;
  name: string;
  level: string;
  schoolYear: string;
  createdAt: string;
  updatedAt: string;
  teachers?: ClassTeacher[];
  timeSlots?: TimeSlot[];
}

export interface ListClassesResponse {
  items: SchoolClass[];
  total: number;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new Error(b?.code ?? b?.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listClasses(token: string, schoolYear?: string): Promise<ListClassesResponse> {
  const qs = schoolYear ? `?schoolYear=${encodeURIComponent(schoolYear)}` : '';
  const res = await fetch(`${BASE}${qs}`, { headers: authHeaders(token) });
  return ok(res);
}

export async function getClass(token: string, id: string): Promise<SchoolClass> {
  const res = await fetch(`${BASE}/${id}`, { headers: authHeaders(token) });
  return ok(res);
}

export async function createClass(
  token: string,
  payload: { name: string; level: string; schoolYear: string },
): Promise<SchoolClass> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function createTimeSlot(
  token: string,
  classId: string,
  payload: {
    dayOfWeek: number;
    periodStart: string;
    periodEnd: string;
    subject: string;
    teacherUserId?: string;
    room?: string;
  },
): Promise<TimeSlot> {
  const res = await fetch(`${BASE}/${classId}/timeslots`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function deleteTimeSlot(token: string, slotId: string): Promise<void> {
  const res = await fetch(`${BASE}/timeslots/${slotId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
}

export async function updateClass(
  token: string,
  id: string,
  payload: { name?: string; level?: string },
): Promise<SchoolClass> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return ok(res);
}

export async function deleteClass(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
}
