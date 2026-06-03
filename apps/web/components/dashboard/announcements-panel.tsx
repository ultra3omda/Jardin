import Link from 'next/link';

export interface Announcement {
  id: string;
  title: string;
  date: string;
}

interface Props {
  announcements: Announcement[];
  /** Only staff roles can manage announcements; parents are read-only. */
  canManage?: boolean;
}

export function AnnouncementsPanel({ announcements, canManage = false }: Props) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Annonces</h2>
        {canManage && (
          <Link href={'/announcements' as never} className="text-xs font-semibold text-ambre-600 hover:text-ambre-700">
            Gérer
          </Link>
        )}
      </div>
      {announcements.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-300">Aucune annonce</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-center justify-between border-b border-slate-50 py-2">
              <span className="text-ink-900">{a.title}</span>
              {/* `date` is already a display string formatted by the API — do not
                  re-parse it (Safari rejects "DD/MM/YYYY" → "Invalid Date"). */}
              <span className="text-xs text-ink-300">{a.date}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
