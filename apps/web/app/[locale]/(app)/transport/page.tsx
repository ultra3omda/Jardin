type RouteStatus = 'ON_TIME' | 'DELAYED' | 'INACTIVE';

interface BusRoute {
  id: string; name: string; driver: string; plate: string;
  studentsCount: number; stops: string[]; departureTime: string; returnTime: string;
  status: RouteStatus;
}

const BUS_ROUTES: BusRoute[] = [
  {
    id: '1', name: 'Ligne A — Nord', driver: 'Rachid Hammouda', plate: 'TN-247-B',
    studentsCount: 22, stops: ['Ariana Centre', 'La Soukra', 'El Menzah VI', 'École'],
    departureTime: '07:15', returnTime: '16:45', status: 'ON_TIME',
  },
  {
    id: '2', name: 'Ligne B — Sud', driver: 'Nabil Ferchichi', plate: 'TN-183-C',
    studentsCount: 18, stops: ['Bardo', 'Cité Sportive', 'El Manar II', 'École'],
    departureTime: '07:30', returnTime: '17:00', status: 'DELAYED',
  },
  {
    id: '3', name: 'Ligne C — Ouest', driver: 'Sami Lassoued', plate: 'TN-521-A',
    studentsCount: 15, stops: ['Manouba', 'Douar Hicher', 'Essijoumi', 'École'],
    departureTime: '07:00', returnTime: '16:30', status: 'INACTIVE',
  },
];

const STATUS_CONFIG: Record<RouteStatus, { label: string; color: string }> = {
  ON_TIME: { label: 'À l\'heure', color: 'bg-green-100 text-green-800' },
  DELAYED: { label: 'Retardé', color: 'bg-yellow-100 text-yellow-800' },
  INACTIVE: { label: 'Inactif', color: 'bg-slate-100 text-slate-600' },
};

export default function TransportPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Transport scolaire</h1>
        <p className="text-sm text-muted-foreground">{BUS_ROUTES.filter((r) => r.status !== 'INACTIVE').length} lignes actives — {BUS_ROUTES.reduce((s, r) => s + r.studentsCount, 0)} élèves transportés.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BUS_ROUTES.map((route) => {
          const sc = STATUS_CONFIG[route.status];
          return (
            <div key={route.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-navy-900">{route.name}</h3>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.color}`}>
                  {sc.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Chauffeur</p><p className="font-medium">{route.driver}</p></div>
                <div><p className="text-xs text-muted-foreground">Immatriculation</p><p className="font-mono">{route.plate}</p></div>
                <div><p className="text-xs text-muted-foreground">Départ</p><p>{route.departureTime}</p></div>
                <div><p className="text-xs text-muted-foreground">Retour</p><p>{route.returnTime}</p></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Arrêts ({route.studentsCount} élèves)</p>
                <div className="flex flex-wrap gap-1">
                  {route.stops.map((stop, i) => (
                    <span key={stop} className={`rounded-full px-2 py-0.5 text-xs ${i === route.stops.length - 1 ? 'bg-amber-100 text-amber-800 font-medium' : 'bg-slate-100 text-slate-700'}`}>
                      {stop}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}