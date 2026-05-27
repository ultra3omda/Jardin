interface DayMenu { day: string; starter: string; main: string; dessert: string; vegetarian: string }

const WEEKLY_MENU: DayMenu[] = [
  { day: 'Lundi', starter: 'Salade de carottes', main: 'Poulet rôti, riz blanc', dessert: 'Yaourt nature', vegetarian: 'Gratin de légumes' },
  { day: 'Mardi', starter: 'Soupe de lentilles', main: 'Bœuf braisé, couscous', dessert: 'Fruit de saison', vegetarian: 'Galette de céréales' },
  { day: 'Mercredi', starter: 'Salade mixte', main: 'Poisson en papillote, purée', dessert: 'Compote de pommes', vegetarian: 'Quiche aux légumes' },
  { day: 'Jeudi', starter: 'Taboulé', main: 'Merguez, frites', dessert: 'Salade de fruits', vegetarian: 'Sandwich végétarien' },
  { day: 'Vendredi', starter: 'Harira', main: 'Kefta, semoule', dessert: 'Gâteau maison', vegetarian: 'Tajine de légumes' },
];

const STATS = [
  { label: 'Élèves inscrits', value: '128', color: 'text-navy-900' },
  { label: 'Repas servis / jour', value: '116', color: 'text-green-700' },
  { label: 'Allergies déclarées', value: '7', color: 'text-red-700' },
  { label: 'Régimes spéciaux', value: '12', color: 'text-yellow-700' },
];

export default function CanteenPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Cantine</h1>
        <p className="text-sm text-muted-foreground">Menus de la semaine et statistiques de fréquentation.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Menu de la semaine</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {WEEKLY_MENU.map((d) => (
            <div key={d.day} className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-navy-900 border-b pb-2">{d.day}</h3>
              <div className="space-y-2 text-sm">
                <div><p className="text-xs font-medium text-muted-foreground uppercase">Entrée</p><p>{d.starter}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground uppercase">Plat</p><p>{d.main}</p></div>
                <div><p className="text-xs font-medium text-muted-foreground uppercase">Dessert</p><p>{d.dessert}</p></div>
                <div className="rounded-md bg-green-50 px-2 py-1">
                  <p className="text-xs font-medium text-green-700 uppercase">Végétarien</p>
                  <p className="text-xs text-green-800">{d.vegetarian}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}