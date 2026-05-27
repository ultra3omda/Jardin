type ActivityCategory = 'SPORTS' | 'ARTS' | 'SCIENCES' | 'LANGUAGES' | 'CIVIC';

interface Activity {
  id: string; name: string; category: ActivityCategory;
  description: string; schedule: string; enrolled: number; max: number; teacher: string;
}

const CATEGORY_CONFIG: Record<ActivityCategory, { label: string; color: string; emoji: string }> = {
  SPORTS: { label: 'Sports', color: 'bg-red-100 text-red-800', emoji: '⚽' },
  ARTS: { label: 'Arts & Culture', color: 'bg-pink-100 text-pink-800', emoji: '🎨' },
  SCIENCES: { label: 'Sciences', color: 'bg-blue-100 text-blue-800', emoji: '🔬' },
  LANGUAGES: { label: 'Langues', color: 'bg-green-100 text-green-800', emoji: '🌍' },
  CIVIC: { label: 'Vie scolaire', color: 'bg-purple-100 text-purple-800', emoji: '🤝' },
};

const ACTIVITIES: Activity[] = [
  { id: '1', name: 'Club Foot', category: 'SPORTS', description: 'Entraînement football tous niveaux.', schedule: 'Mardi & Jeudi 16h30-18h00', enrolled: 18, max: 22, teacher: 'M. Moreau' },
  { id: '2', name: 'Natation', category: 'SPORTS', description: 'Piscine municipale — cours encadrés.', schedule: 'Mercredi 10h00-11h30', enrolled: 12, max: 15, teacher: 'Mme Chatti' },
  { id: '3', name: 'Théâtre', category: 'ARTS', description: "Atelier d'expression dramatique et de mise en scène.", schedule: 'Vendredi 15h00-17h00', enrolled: 14, max: 20, teacher: 'Mme Leroy' },
  { id: '4', name: 'Chorale', category: 'ARTS', description: "Chant choral — préparation fête de fin d'année.", schedule: 'Lundi 12h00-13h00', enrolled: 24, max: 30, teacher: 'M. Hamdi' },
  { id: '5', name: 'Club Sciences', category: 'SCIENCES', description: 'Expériences pratiques et projets scientifiques.', schedule: 'Mercredi 14h00-16h00', enrolled: 10, max: 15, teacher: 'M. Bernard' },
  { id: '6', name: 'Anglais renforcé', category: 'LANGUAGES', description: "Pratique orale et culturelle de l'anglais.", schedule: 'Mardi 12h00-13h00', enrolled: 16, max: 18, teacher: 'Mme Martin' },
  { id: '7', name: 'Conseil des élèves', category: 'CIVIC', description: 'Délégués de classe et projets solidaires.', schedule: 'Jeudi 12h00-13h00', enrolled: 8, max: 12, teacher: 'M. Dupont' },
];

export default function ActivitiesPage() {
  const categories = (Object.keys(CATEGORY_CONFIG) as ActivityCategory[]).filter(
    (cat) => ACTIVITIES.some((a) => a.category === cat)
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Activités périscolaires</h1>
        <p className="text-sm text-muted-foreground">{ACTIVITIES.length} activités proposées — {ACTIVITIES.reduce((s, a) => s + a.enrolled, 0)} inscriptions.</p>
      </header>

      {categories.map((cat) => {
        const cfg = CATEGORY_CONFIG[cat];
        const items = ACTIVITIES.filter((a) => a.category === cat);
        return (
          <section key={cat}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy-900">
              <span>{cfg.emoji}</span> {cfg.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((act) => {
                const pct = Math.round((act.enrolled / act.max) * 100);
                const full = act.enrolled >= act.max;
                return (
                  <div key={act.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-navy-900">{act.name}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${full ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {full ? 'Complet' : 'Places dispo'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{act.description}</p>
                    <p className="text-xs text-muted-foreground">{act.schedule}</p>
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{act.teacher}</span>
                        <span>{act.enrolled}/{act.max} élèves</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}