type Mood = 'GREAT' | 'GOOD' | 'NEUTRAL' | 'DIFFICULT';

interface JournalEntry {
  id: string; date: string; time: string; teacher: string;
  className: string; activity: string; notes: string; mood: Mood;
}

const MOOD_CONFIG: Record<Mood, { emoji: string; label: string; color: string }> = {
  GREAT: { emoji: '😄', label: 'Excellent', color: 'bg-green-100 text-green-800' },
  GOOD: { emoji: '🙂', label: 'Bien', color: 'bg-blue-100 text-blue-800' },
  NEUTRAL: { emoji: '😐', label: 'Neutre', color: 'bg-slate-100 text-slate-700' },
  DIFFICULT: { emoji: '😔', label: 'Difficile', color: 'bg-orange-100 text-orange-800' },
};

const JOURNAL_ENTRIES: JournalEntry[] = [
  { id: '1', date: '2025-02-14', time: '09:30', teacher: 'Mme Martin', className: 'CP-A', activity: 'Lecture silencieuse — chapitre 4 du "Petit Prince"', notes: 'Les élèves ont été très concentrés. 3 élèves ont terminé le chapitre en avance.', mood: 'GREAT' },
  { id: '2', date: '2025-02-14', time: '10:45', teacher: 'M. Dupont', className: 'CE1-B', activity: 'Calcul mental — tables de multiplication 6 et 7', notes: 'Session difficile pour certains. Révision prévue demain en groupe.', mood: 'DIFFICULT' },
  { id: '3', date: '2025-02-14', time: '14:00', teacher: 'Mme Leroy', className: 'CM2-A', activity: 'Exposé en groupe sur la Révolution française', notes: 'Excellente participation. Les 4 groupes ont bien préparé leur présentation.', mood: 'GREAT' },
  { id: '4', date: '2025-02-13', time: '09:00', teacher: 'Mme Martin', className: 'CP-A', activity: 'Dessin libre — thème "Ma famille"', notes: 'Activité artistique très appréciée. Travaux affichés dans le couloir.', mood: 'GOOD' },
  { id: '5', date: '2025-02-13', time: '11:00', teacher: 'M. Bernard', className: 'CE2-C', activity: "Sciences — expérience sur les états de l'eau", notes: 'Expérience réussie. Les enfants ont adoré observer la condensation.', mood: 'GREAT' },
  { id: '6', date: '2025-02-12', time: '15:00', teacher: 'Mme Leroy', className: 'CM2-A', activity: 'Sport collectif — handball', notes: 'Bonne ambiance. Quelques tensions résolues rapidement.', mood: 'GOOD' },
];

export default function JournalPage() {
  const today = JOURNAL_ENTRIES.filter((e) => e.date === '2025-02-14');
  const previous = JOURNAL_ENTRIES.filter((e) => e.date !== '2025-02-14');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Journal quotidien</h1>
        <p className="text-sm text-muted-foreground">Activités et observations des classes au fil des jours.</p>
      </header>

      {[
        { label: "Aujourd'hui — 14/02/2025", entries: today },
        { label: 'Jours précédents', entries: previous },
      ].map(({ label, entries }) =>
        entries.length > 0 ? (
          <section key={label}>
            <h2 className="mb-3 text-base font-semibold text-navy-900">{label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const mc = MOOD_CONFIG[entry.mood];
                return (
                  <div key={entry.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-navy-900 text-sm">{entry.className}</p>
                        <p className="text-xs text-muted-foreground">{entry.teacher} · {entry.time}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mc.color}`}>
                        {mc.emoji} {mc.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{entry.activity}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{entry.notes}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}