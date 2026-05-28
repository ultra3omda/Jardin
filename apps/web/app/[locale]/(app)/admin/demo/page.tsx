'use client';

import { useState } from 'react';
import { Mail, Phone, Clock } from 'lucide-react';

type DemoStatus = 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'DONE' | 'DECLINED';

interface DemoRequest {
  id: string;
  school: string;
  contact: string;
  email: string;
  phone: string;
  type: string;
  students: string;
  message: string;
  status: DemoStatus;
  receivedAt: string;
}

const STATUS_LABELS: Record<DemoStatus, string> = {
  NEW: 'Nouveau', CONTACTED: 'Contacté', SCHEDULED: 'Planifié', DONE: 'Terminé', DECLINED: 'Décliné',
};
const STATUS_COLORS: Record<DemoStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-yellow-100 text-yellow-700',
  SCHEDULED: 'bg-purple-100 text-purple-700', DONE: 'bg-green-100 text-green-700',
  DECLINED: 'bg-slate-100 text-slate-600',
};

const INITIAL_REQUESTS: DemoRequest[] = [
  { id: '1', school: 'École El Amal — Sfax', contact: 'M. Zouari', email: 'zouari@el-amal.edu.tn', phone: '+216 74 123 456', type: 'Primaire', students: '150-250', message: 'Nous cherchons une solution complète pour gérer notre école. Très intéressés par le module bulletins.', status: 'NEW', receivedAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
  { id: '2', school: 'Collège Ibn Khaldoun — Tunis', contact: 'Mme Haddad', email: 'haddad@ibn-khaldoun.edu.tn', phone: '+216 71 987 654', type: 'Collège', students: '300-500', message: 'Nous souhaitons automatiser la gestion des absences et la communication avec les parents.', status: 'NEW', receivedAt: new Date(Date.now() - 1 * 86400_000).toISOString() },
  { id: '3', school: 'École Privée Les Pins — Sousse', contact: 'M. Karoui', email: 'karoui@lespins.tn', phone: '+216 73 456 789', type: 'Primaire + Maternelle', students: '100-150', message: 'Petite école privée, intéressés par le module maternelle notamment.', status: 'CONTACTED', receivedAt: new Date(Date.now() - 2 * 86400_000).toISOString() },
  { id: '4', school: 'Groupe Scolaire El Manar', contact: 'Mme Mansouri', email: 'mansouri@el-manar.edu.tn', phone: '+216 71 234 567', type: 'Primaire', students: '200-300', message: 'Démo programmée pour la semaine prochaine avec notre équipe direction.', status: 'SCHEDULED', receivedAt: new Date(Date.now() - 5 * 86400_000).toISOString() },
  { id: '5', school: 'École Publique Erriadh', contact: 'M. Ben Salem', email: 'bensalem@erriadh.edu.tn', phone: '+216 72 111 222', type: 'Primaire', students: '300+', message: 'Budget limité pour cette année scolaire.', status: 'DECLINED', receivedAt: new Date(Date.now() - 10 * 86400_000).toISOString() },
];

export default function AdminDemoPage() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [selected, setSelected] = useState<DemoRequest | null>(null);

  function updateStatus(id: string, status: DemoStatus) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected((p) => p ? { ...p, status } : null);
  }

  const pending = requests.filter((r) => r.status === 'NEW' || r.status === 'CONTACTED').length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Demandes de démo</h1>
          <p className="text-sm text-muted-foreground">Gérez les demandes de démonstration entrantes.</p>
        </div>
        {pending > 0 && (
          <span className="rounded-full bg-ambre-100 px-3 py-1 text-sm font-semibold text-ambre-700">{pending} à traiter</span>
        )}
      </header>

      <div className="flex gap-4">
        <div className="flex-1 overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
                <th className="px-4 py-3">École</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reçu le</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className={`cursor-pointer border-b last:border-0 hover:bg-slate-50 ${selected?.id === r.id ? 'bg-ambre-50' : ''}`}
                  onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-medium text-navy-900">{r.school}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.contact}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.type}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(r.receivedAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.status === 'NEW' && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'CONTACTED'); }}
                          className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100">Contacter</button>
                      )}
                      {(r.status === 'NEW' || r.status === 'CONTACTED') && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'SCHEDULED'); }}
                          className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-100">Planifier</button>
                      )}
                      {r.status === 'SCHEDULED' && (
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(r.id, 'DONE'); }}
                          className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100">Terminé</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="w-80 flex-none rounded-xl border bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-navy-900">{selected.school}</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-ink-900">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /><a href={`mailto:${selected.email}`} className="hover:underline">{selected.email}</a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /><span>{selected.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /><span>{new Date(selected.receivedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground italic">&ldquo;{selected.message}&rdquo;</div>
            <div className="text-xs text-muted-foreground">Élèves : {selected.students}</div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-navy-900">Changer le statut :</p>
              <div className="flex flex-wrap gap-1">
                {(['NEW', 'CONTACTED', 'SCHEDULED', 'DONE', 'DECLINED'] as DemoStatus[]).map((s) => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${selected.status === s ? STATUS_COLORS[s] : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
