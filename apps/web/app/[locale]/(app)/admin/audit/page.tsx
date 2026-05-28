'use client';

import { useState } from 'react';
import { Shield, UserCircle, Settings, CreditCard, Users, AlertTriangle } from 'lucide-react';

type EventType = 'AUTH' | 'USER' | 'TENANT' | 'BILLING' | 'SECURITY' | 'SYSTEM';

interface AuditEntry {
  id: string;
  type: EventType;
  action: string;
  actor: string;
  target: string;
  tenant: string;
  ip: string;
  at: string;
  severity: 'info' | 'warning' | 'critical';
}

const TYPE_ICONS: Record<EventType, typeof Shield> = {
  AUTH: UserCircle, USER: Users, TENANT: Settings, BILLING: CreditCard, SECURITY: Shield, SYSTEM: AlertTriangle,
};
const TYPE_COLORS: Record<EventType, string> = {
  AUTH: 'bg-blue-50 text-blue-600', USER: 'bg-purple-50 text-purple-600', TENANT: 'bg-slate-50 text-slate-600',
  BILLING: 'bg-green-50 text-green-600', SECURITY: 'bg-red-50 text-red-600', SYSTEM: 'bg-orange-50 text-orange-600',
};
const SEV_COLORS: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700', warning: 'bg-yellow-50 text-yellow-700', critical: 'bg-red-50 text-red-700',
};

const AUDIT_LOG: AuditEntry[] = [
  { id: '1', type: 'AUTH', action: 'demo_login', actor: 'super@klasso.tn', target: 'super-admin session', tenant: 'Klasso', ip: '196.203.15.42', at: new Date(Date.now() - 2 * 60_000).toISOString(), severity: 'info' },
  { id: '2', type: 'TENANT', action: 'tenant_created', actor: 'super@klasso.tn', target: 'École El Amal (demo-el-amal)', tenant: 'Klasso', ip: '196.203.15.42', at: new Date(Date.now() - 25 * 60_000).toISOString(), severity: 'info' },
  { id: '3', type: 'BILLING', action: 'invoice_created', actor: 'admin@demo-ecole.klasso.tn', target: 'Facture T2 2025-2026', tenant: 'demo-ecole', ip: '41.228.10.5', at: new Date(Date.now() - 2 * 3600_000).toISOString(), severity: 'info' },
  { id: '4', type: 'SECURITY', action: 'failed_login_attempt', actor: 'unknown@external.com', target: 'admin@demo-ecole.klasso.tn', tenant: 'demo-ecole', ip: '80.14.77.203', at: new Date(Date.now() - 3 * 3600_000).toISOString(), severity: 'warning' },
  { id: '5', type: 'USER', action: 'user_role_changed', actor: 'admin@demo-ecole.klasso.tn', target: 'staff@demo-ecole → TEACHER', tenant: 'demo-ecole', ip: '41.228.10.5', at: new Date(Date.now() - 5 * 3600_000).toISOString(), severity: 'warning' },
  { id: '6', type: 'TENANT', action: 'tenant_suspended', actor: 'super@klasso.tn', target: 'École Privée Les Jasmins', tenant: 'Klasso', ip: '196.203.15.42', at: new Date(Date.now() - 1 * 86400_000).toISOString(), severity: 'critical' },
  { id: '7', type: 'AUTH', action: 'password_changed', actor: 'prof@demo-ecole.klasso.tn', target: 'own account', tenant: 'demo-ecole', ip: '41.228.77.10', at: new Date(Date.now() - 1 * 86400_000).toISOString(), severity: 'info' },
  { id: '8', type: 'BILLING', action: 'payment_recorded', actor: 'admin@demo-ecole.klasso.tn', target: 'Invoice #inv_2 — 350 TND', tenant: 'demo-ecole', ip: '41.228.10.5', at: new Date(Date.now() - 2 * 86400_000).toISOString(), severity: 'info' },
  { id: '9', type: 'SECURITY', action: 'refresh_token_revoked', actor: 'admin@demo-maternelle.klasso.tn', target: 'all sessions', tenant: 'demo-maternelle', ip: '41.228.55.91', at: new Date(Date.now() - 2 * 86400_000).toISOString(), severity: 'warning' },
  { id: '10', type: 'SYSTEM', action: 'migration_applied', actor: 'system', target: 'v6_pedagogy_bulletins', tenant: 'Klasso', ip: 'internal', at: new Date(Date.now() - 3 * 86400_000).toISOString(), severity: 'info' },
];

const TYPES: Array<EventType | ''> = ['', 'AUTH', 'USER', 'TENANT', 'BILLING', 'SECURITY', 'SYSTEM'];
const TYPE_LABELS: Record<string, string> = { '': 'Tous les types', AUTH: 'Authentification', USER: 'Utilisateurs', TENANT: 'Établissements', BILLING: 'Facturation', SECURITY: 'Sécurité', SYSTEM: 'Système' };

export default function AdminAuditPage() {
  const [filterType, setFilterType] = useState<EventType | ''>('');
  const [filterSev, setFilterSev] = useState('');

  const filtered = AUDIT_LOG.filter((e) =>
    (!filterType || e.type === filterType) && (!filterSev || e.severity === filterSev)
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Journal d&apos;audit</h1>
        <p className="text-sm text-muted-foreground">Historique des événements de la plateforme.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select className="rounded-md border px-3 py-2 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value as EventType | '')}>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select className="rounded-md border px-3 py-2 text-sm" value={filterSev} onChange={(e) => setFilterSev(e.target.value)}>
          <option value="">Toutes sévérités</option>
          <option value="info">Info</option>
          <option value="warning">Attention</option>
          <option value="critical">Critique</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-700">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Acteur</th>
              <th className="px-4 py-3">Cible</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Sévérité</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const Icon = TYPE_ICONS[e.type];
              return (
                <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[e.type]}`}>
                      <Icon className="h-3 w-3" />{e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px]">{e.actor}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px]">{e.target}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{e.tenant}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.ip}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV_COLORS[e.severity]}`}>
                      {e.severity === 'info' ? 'Info' : e.severity === 'warning' ? 'Attention' : 'Critique'}
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
