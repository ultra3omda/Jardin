type SecurityEventType = 'ENTRY' | 'EXIT' | 'ALERT' | 'VISITOR';

interface SecurityEvent {
  id: string; time: string; date: string;
  type: SecurityEventType; person: string; detail: string; recordedBy: string;
}

const EVENT_CONFIG: Record<SecurityEventType, { label: string; color: string; dot: string }> = {
  ENTRY: { label: 'Entrée', color: 'text-green-800', dot: 'bg-green-500' },
  EXIT: { label: 'Sortie', color: 'text-blue-800', dot: 'bg-blue-500' },
  ALERT: { label: 'Alerte', color: 'text-red-800', dot: 'bg-red-500' },
  VISITOR: { label: 'Visiteur', color: 'text-purple-800', dot: 'bg-purple-500' },
};

const SECURITY_EVENTS: SecurityEvent[] = [
  { id: '1', time: '07:45', date: '2025-02-14', type: 'ENTRY', person: 'Mme Martin (enseignante)', detail: 'Entrée badge N°142', recordedBy: 'Système' },
  { id: '2', time: '08:00', date: '2025-02-14', type: 'ENTRY', person: 'M. Dupont (directeur)', detail: 'Entrée badge N°001', recordedBy: 'Système' },
  { id: '3', time: '08:15', date: '2025-02-14', type: 'VISITOR', person: 'Parent : M. Gharbi', detail: 'Visite prévue — rendez-vous direction', recordedBy: 'Accueil' },
  { id: '4', time: '10:30', date: '2025-02-14', type: 'ALERT', person: 'Inconnu', detail: 'Individu non identifié observé près de la clôture — zone nord', recordedBy: 'Agent sécurité' },
  { id: '5', time: '12:00', date: '2025-02-14', type: 'EXIT', person: 'Khalil Mejri (élève, fièvre)', detail: 'Sortie anticipée — parent prévenu et présent', recordedBy: 'Infirmière' },
  { id: '6', time: '16:30', date: '2025-02-14', type: 'EXIT', person: 'Tous élèves', detail: 'Fin de journée — sortie normale', recordedBy: 'Système' },
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Sécurité</h1>
        <p className="text-sm text-muted-foreground">Journal des entrées, sorties et incidents.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {(['ENTRY', 'EXIT', 'VISITOR', 'ALERT'] as SecurityEventType[]).map((type) => {
          const count = SECURITY_EVENTS.filter((e) => e.type === type).length;
          const cfg = EVENT_CONFIG[type];
          return (
            <div key={type} className="rounded-xl border bg-white p-4 shadow-sm flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${cfg.dot} flex-shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className="text-xl font-bold text-navy-900">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-navy-900 text-sm">Journal du {new Date(SECURITY_EVENTS[0].date).toLocaleDateString('fr-FR')}</h2>
        </div>
        <div className="divide-y">
          {SECURITY_EVENTS.map((ev) => {
            const cfg = EVENT_CONFIG[ev.type];
            return (
              <div key={ev.id} className="flex items-start gap-4 px-4 py-3">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                  <span className="font-mono text-xs text-muted-foreground">{ev.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    <span className="font-medium text-sm text-navy-900">{ev.person}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{ev.detail}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Par : {ev.recordedBy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}