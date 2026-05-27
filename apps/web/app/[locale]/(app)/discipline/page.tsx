type IncidentType = 'MINOR' | 'MAJOR' | 'SUSPENSION';

interface Incident {
  id: string; date: string; studentName: string;
  type: IncidentType; description: string; teacher: string; sanction: string; resolved: boolean;
}

const TYPE_CONFIG: Record<IncidentType, { label: string; color: string }> = {
  MINOR: { label: 'Mineur', color: 'bg-yellow-100 text-yellow-800' },
  MAJOR: { label: 'Majeur', color: 'bg-orange-100 text-orange-800' },
  SUSPENSION: { label: 'Suspension', color: 'bg-red-100 text-red-800' },
};

const INCIDENTS: Incident[] = [
  { id: '1', date: '2025-01-20', studentName: 'Mohamed Chaabane', type: 'MINOR', description: 'Bavardage répété en cours malgré 3 avertissements.', teacher: 'Mme Martin', sanction: 'Avertissement oral', resolved: true },
  { id: '2', date: '2025-01-28', studentName: 'Yassine Belhaj', type: 'MAJOR', description: 'Bagarre dans la cour de récréation — blessure légère d\'un autre élève.', teacher: 'M. Bernard', sanction: 'Convocation parents + retenue', resolved: true },
  { id: '3', date: '2025-02-05', studentName: 'Ahmed Ben Ali', type: 'MINOR', description: 'Oubli répété du matériel scolaire (3ème fois ce mois).', teacher: 'Mme Leroy', sanction: 'Lettre aux parents', resolved: false },
  { id: '4', date: '2025-02-10', studentName: 'Rim Chaabane', type: 'SUSPENSION', description: 'Insolence grave envers un enseignant — propos irrespectueux.', teacher: 'M. Dupont', sanction: 'Suspension 2 jours', resolved: false },
  { id: '5', date: '2025-02-12', studentName: 'Khalil Mejri', type: 'MINOR', description: 'Utilisation du téléphone portable pendant les cours.', teacher: 'Mme Martin', sanction: 'Confiscation temporaire', resolved: true },
];

export default function DisciplinePage() {
  const open = INCIDENTS.filter((i) => !i.resolved).length;
  const closed = INCIDENTS.filter((i) => i.resolved).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Discipline</h1>
        <p className="text-sm text-muted-foreground">{open} incident(s) en cours · {closed} résolu(s) ce mois.</p>
      </header>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Sanction</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {INCIDENTS.map((inc) => {
              const tc = TYPE_CONFIG[inc.type];
              return (
                <tr key={inc.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(inc.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 font-medium">{inc.studentName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tc.color}`}>
                      {tc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs text-xs">{inc.description}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inc.sanction}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${inc.resolved ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
                      {inc.resolved ? 'Résolu' : 'En cours'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}