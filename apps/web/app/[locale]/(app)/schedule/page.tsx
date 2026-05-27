'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface ClassOption { id: string; name: string }
interface Slot { time: string; subject: string; teacher: string; color: string }
interface DaySchedule { day: string; short: string; slots: (Slot | null)[] }

const TIMES = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': 'bg-blue-100 text-blue-800 border-blue-200',
  'Français': 'bg-green-100 text-green-800 border-green-200',
  'Sciences': 'bg-purple-100 text-purple-800 border-purple-200',
  'Histoire-Géo': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Éducation Physique': 'bg-red-100 text-red-800 border-red-200',
  'Arts Plastiques': 'bg-pink-100 text-pink-800 border-pink-200',
  'Musique': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

function buildDemo(className: string): DaySchedule[] {
  const teachers = ['M. Dupont', 'Mme Martin', 'M. Bernard', 'Mme Leroy', 'M. Moreau'];
  const subjects = Object.keys(SUBJECT_COLORS);
  const seed = className.charCodeAt(0) ?? 65;
  return [
    { day: 'Lundi', short: 'Lun' },
    { day: 'Mardi', short: 'Mar' },
    { day: 'Mercredi', short: 'Mer' },
    { day: 'Jeudi', short: 'Jeu' },
    { day: 'Vendredi', short: 'Ven' },
  ].map((d, di) => ({
    ...d,
    slots: TIMES.map((_, ti) => {
      if ((di + ti) % 7 === 3) return null;
      const subj = subjects[(seed + di * 3 + ti) % subjects.length];
      return {
        time: TIMES[ti],
        subject: subj,
        teacher: teachers[(seed + di + ti) % teachers.length],
        color: SUBJECT_COLORS[subj] ?? 'bg-slate-100 text-slate-700 border-slate-200',
      };
    }),
  }));
}

export default function SchedulePage() {
  const token = useAuthStore((s) => s.accessToken);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json() as Promise<{ items: ClassOption[] }>)
      .then((d) => {
        const items = d.items ?? [];
        setClasses(items);
        if (items.length > 0) setSelectedClass(items[0].id);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  const className = classes.find((c) => c.id === selectedClass)?.name ?? 'Classe';
  const schedule = selectedClass ? buildDemo(className) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Emploi du temps</h1>
        <p className="text-sm text-muted-foreground">Consultez les emplois du temps par classe.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select className="rounded-md border px-3 py-2 text-sm" value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)} disabled={loading}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {selectedClass && <span className="text-sm text-muted-foreground">Année scolaire 2024-2025</span>}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : schedule.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Aucune classe disponible.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-navy-700 w-16">Heure</th>
                {schedule.map((d) => (
                  <th key={d.day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-navy-700">{d.day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMES.map((time, ti) => (
                <tr key={time} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{time}</td>
                  {schedule.map((d) => {
                    const slot = d.slots[ti];
                    return (
                      <td key={d.day} className="px-2 py-2 text-center">
                        {slot ? (
                          <div className={`rounded-lg border px-2 py-1.5 ${slot.color}`}>
                            <div className="font-medium leading-tight">{slot.subject}</div>
                            <div className="text-xs opacity-75 mt-0.5">{slot.teacher}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(SUBJECT_COLORS).map(([subj, color]) => (
          <span key={subj} className={`rounded-full border px-3 py-0.5 text-xs font-medium ${color}`}>{subj}</span>
        ))}
      </div>
    </div>
  );
}