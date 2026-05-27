type HealthNoteType = 'VISIT' | 'ALLERGY' | 'MEDICATION' | 'INCIDENT';

interface HealthNote {
  id: string; studentName: string; date: string;
  type: HealthNoteType; description: string; recordedBy: string;
}

const TYPE_CONFIG: Record<HealthNoteType, { label: string; color: string }> = {
  VISIT: { label: 'Visite', color: 'bg-blue-100 text-blue-800' },
  ALLERGY: { label: 'Allergie', color: 'bg-red-100 text-red-800' },
  MEDICATION: { label: 'Médicament', color: 'bg-yellow-100 text-yellow-800' },
  INCIDENT: { label: 'Incident', color: 'bg-orange-100 text-orange-800' },
};

const HEALTH_NOTES: HealthNote[] = [
  { id: '1', studentName: 'Ahmed Ben Ali', date: '2025-01-15', type: 'ALLERGY', description: 'Allergie aux arachides — épinéphrine disponible à l\'infirmerie.', recordedBy: 'Infirmière Mme Chatti' },
  { id: '2', studentName: 'Fatma Trabelsi', date: '2025-01-20', type: 'VISIT', description: 'Visite médicale annuelle — résultats normaux.', recordedBy: 'Dr. Mansour' },
  { id: '3', studentName: 'Mohamed Chaabane', date: '2025-02-03', type: 'MEDICATION', description: 'Ventoline 2 bouffées matin et soir (asthme léger).', recordedBy: 'Infirmière Mme Chatti' },
  { id: '4', studentName: 'Yasmine Gharbi', date: '2025-02-10', type: 'INCIDENT', description: 'Chute lors de récréation — plaie superficielle au genou droit soignée sur place.', recordedBy: 'M. Dupont' },
  { id: '5', studentName: 'Khalil Mejri', date: '2025-02-14', type: 'VISIT', description: 'Visite suite à fièvre — rentré à la maison à 14h00.', recordedBy: 'Infirmière Mme Chatti' },
];

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Santé</h1>
        <p className="text-sm text-muted-foreground">Suivi médical et infirmerie.</p>
      </header>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Données médicales — RGPD</strong> : ces informations sont confidentielles et accessibles uniquement au personnel habilité. Elles ne doivent pas être partagées sans consentement explicite.
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Enregistré par</th>
            </tr>
          </thead>
          <tbody>
            {HEALTH_NOTES.map((note) => {
              const tc = TYPE_CONFIG[note.type];
              return (
                <tr key={note.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{note.studentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(note.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tc.color}`}>
                      {tc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs">{note.description}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{note.recordedBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}