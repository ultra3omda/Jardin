import Link from 'next/link';

export interface NotePreview {
  id: string;
  studentName: string;
  subjectName: string;
  scaledScore: number;
  date: string;
}

interface Props {
  notes: NotePreview[];
}

export function NotesPanel({ notes }: Props) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Dernières Notes Saisies</h2>
        <Link href={'/notes' as never} className="text-xs font-semibold text-ambre-600 hover:text-ambre-700">
          Voir tout
        </Link>
      </div>
      {notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-300">Aucune note récente.</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_1.5fr_0.6fr_0.7fr] gap-2 border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            <div>Élève</div><div>Matière</div><div>Note</div><div>Date</div>
          </div>
          {notes.map((n) => (
            <div key={n.id} className="grid grid-cols-[1fr_1.5fr_0.6fr_0.7fr] gap-2 border-b border-slate-50 py-3 text-sm text-ink-900">
              <div>{n.studentName}</div>
              <div className="text-ink-500">{n.subjectName}</div>
              <div>
                <span className="inline-flex rounded-full bg-ambre-100 px-2.5 py-0.5 text-xs font-semibold text-ambre-700">
                  {n.scaledScore.toFixed(2)}/20
                </span>
              </div>
              {/* `date` is already formatted by the API — re-parsing breaks on Safari. */}
              <div className="text-xs text-ink-500">{n.date}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
