'use client';

/**
 * Shared demo fixtures for the Classes / EDT module.
 *
 * Single source of truth so the list view AND the detail/sub views (class
 * detail, gradebook) fall back to the SAME data when the API is unreachable.
 * A demo click-through (list → detail) therefore never shows a
 * "Class not found" error. Classes are enriched with a main teacher and a
 * sample weekly timetable so the detail view looks populated.
 */
import type { ClassTeacher, SchoolClass, TimeSlot } from '@/lib/api/classes';

const STAMP = '2024-09-01T08:00:00Z';

interface DemoTeacher {
  id: string;
  firstName: string;
  lastName: string;
}

function mkTeacher(t: DemoTeacher) {
  return {
    id: t.id,
    email: `${t.firstName}.${t.lastName}@ecole.demo`.toLowerCase(),
    firstName: t.firstName,
    lastName: t.lastName,
  };
}

function mkSlots(classId: string, teacher: DemoTeacher): TimeSlot[] {
  const t = mkTeacher(teacher);
  const defs: Array<{ day: number; start: string; end: string; subject: string; room?: string }> = [
    { day: 1, start: '08:00', end: '09:00', subject: 'Mathématiques' },
    { day: 1, start: '09:00', end: '10:00', subject: 'Français' },
    { day: 1, start: '10:15', end: '11:15', subject: 'Éveil', room: 'Salle 3' },
    { day: 2, start: '08:00', end: '09:00', subject: 'Français' },
    { day: 2, start: '09:00', end: '10:00', subject: 'Mathématiques' },
    { day: 3, start: '08:00', end: '09:00', subject: 'Arabe' },
    { day: 3, start: '09:00', end: '10:00', subject: 'Sport', room: 'Gymnase' },
  ];
  return defs.map((d, i) => ({
    id: `${classId}-slot-${i + 1}`,
    classId,
    dayOfWeek: d.day,
    periodStart: d.start,
    periodEnd: d.end,
    subject: d.subject,
    teacherUserId: teacher.id,
    room: d.room ?? null,
    createdAt: STAMP,
    updatedAt: STAMP,
    teacher: t,
  }));
}

function mkClass(id: string, name: string, level: string, teacher: DemoTeacher): SchoolClass {
  const teachers: ClassTeacher[] = [
    {
      id: `${id}-ct-1`,
      classId: id,
      teacherUserId: teacher.id,
      subject: 'Polyvalent',
      isMainTeacher: true,
      createdAt: STAMP,
      teacher: mkTeacher(teacher),
    },
  ];
  return {
    id,
    name,
    level,
    schoolYear: '2025-2026',
    createdAt: STAMP,
    updatedAt: STAMP,
    teachers,
    timeSlots: mkSlots(id, teacher),
  };
}

export const DEMO_SCHOOL_CLASSES: SchoolClass[] = [
  mkClass('demo-class-1', 'CP-A', 'CP', { id: 'dt-1', firstName: 'Sonia', lastName: 'Khelifi' }),
  mkClass('demo-class-2', 'CE1-B', 'CE1', { id: 'dt-2', firstName: 'Karim', lastName: 'Bouzid' }),
  mkClass('demo-class-3', 'CM1-A', 'CM1', { id: 'dt-3', firstName: 'Leila', lastName: 'Mansour' }),
  mkClass('demo-class-4', 'CM2-B', 'CM2', { id: 'dt-4', firstName: 'Hatem', lastName: 'Jaziri' }),
  mkClass('demo-class-5', 'CE2-A', 'CE2', { id: 'dt-5', firstName: 'Rim', lastName: 'Toumi' }),
];

/** Look up a demo class by id — used by detail/sub pages as an API fallback. */
export function findDemoClass(id: string): SchoolClass | undefined {
  return DEMO_SCHOOL_CLASSES.find((c) => c.id === id);
}
